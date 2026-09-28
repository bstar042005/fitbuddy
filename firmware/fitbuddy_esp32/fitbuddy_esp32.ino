/*
 * FitBuddy — screenless, haptic-first fitness coach
 * ESP32 + BNO085 (9-axis, on-chip sensor fusion) + coin vibration motor + BLE
 *
 * "Process first, transmit later":
 *   IMU -> rep segmentation -> features -> exercise recognition -> scoring
 *   -> haptic cue (on-device, ms latency) -> BLE sends only results.
 *
 * BLE: Nordic UART Service, newline-delimited JSON (see src/lib/ble.ts).
 *
 * Libraries (Arduino Library Manager):
 *   - Adafruit BNO08x      (Adafruit)
 *   - ArduinoJson  v7      (Benoit Blanchon)
 * Board: ESP32 Arduino core 3.x ("esp32" by Espressif).
 *
 * STATUS: prototype firmware — compiles against the libraries above but the
 * thresholds need tuning on real hardware, and exercise recognition is a
 * rule-based placeholder for a TinyML model (see form_engine.h).
 */
#include <Wire.h>
#include <esp_mac.h>
#include <Preferences.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Adafruit_BNO08x.h>
#include <ArduinoJson.h>
#include "config.h"
#include "haptics.h"
#include "form_engine.h"

// ------------------------------------------------------------------ globals
Adafruit_BNO08x bno(PIN_BNO_RESET);
sh2_SensorValue_t sensorValue;
Preferences prefs;
HapticPlayer haptic;

BLEServer* bleServer = nullptr;
BLECharacteristic* txChar = nullptr;
bool bleConnected = false;
String rxBuffer;
String deviceName;

// Settings (persisted in NVS, updated by the app)
struct Settings {
  char mode = 'W';            // W workout, S study, R recovery
  int sedentaryMins = 45;
  int postureSecs = 60;
  bool strict = false;
  bool hapticOn = true;
  int intensity = 2;
  bool confirmPulses = true;
  char challenge[20] = "arm_circles";
  int challengeTarget = 10;
  int exerciseOverride = EX_AUTO;
} settings;

Baseline baselines[EX_COUNT];
bool calibrated[EX_COUNT] = {false};

// Orientation state
float qw = 1, qx = 0, qy = 0, qz = 0;       // current game rotation vector
float restGx = 0, restGy = 0, restGz = 1;    // gravity direction at rest (device frame)
float gyroDps = 0;                           // |angular velocity|
float linAcc = 0;                            // |linear acceleration| m/s^2
unsigned long stillSince = 0;

// Rep segmentation
enum RepState { REP_IDLE, REP_MOVING } repState = REP_IDLE;
unsigned long repStart = 0;
float repMaxTilt = 0, repPeakVel = 0, repSwaySq = 0, repRestRoll = 0;
int repSwayN = 0;

// Modes
bool calibrating = false;
int calibExercise = EX_SQUAT;
bool liveStream = false;
unsigned long lastRawSent = 0;

// Anti-sedentary
unsigned long lastActiveAt = 0;
bool challengeActive = false;
unsigned long challengeStart = 0, lastReminder = 0, lastPeakAt = 0;
int challengeCount = 0;
bool aboveThreshold = false;

// Posture (study mode)
unsigned long slouchSince = 0;
float uprightGx = 0, uprightGy = 0, uprightGz = 1;

// Recovery
int recSteps[10];
int recCount = 0, recIndex = -1;
unsigned long recStepStart = 0;

unsigned long lastBattery = 0;

// ------------------------------------------------------------------ helpers
static inline float rad2deg(float r) { return r * 57.29578f; }

// Gravity direction in the device frame from the rotation quaternion.
void gravityFromQuat(float& gx, float& gy, float& gz) {
  gx = 2 * (qx * qz - qw * qy);
  gy = 2 * (qw * qx + qy * qz);
  gz = qw * qw - qx * qx - qy * qy + qz * qz;
}

float angleBetween(float ax, float ay, float az, float bx, float by, float bz) {
  float dot = ax * bx + ay * by + az * bz;
  return rad2deg(acosf(constrain(dot, -1.0f, 1.0f)));
}

float rollDeg() {  // lateral lean, used as the "sway" axis
  float gx, gy, gz;
  gravityFromQuat(gx, gy, gz);
  return rad2deg(atan2f(gy, gz));
}

void bleSend(JsonDocument& doc) {
  if (!bleConnected || !txChar) return;
  String out;
  serializeJson(doc, out);
  out += "\n";
  // 20-byte chunks work with the default MTU; the app reassembles on '\n'
  const unsigned int len = out.length();
  for (unsigned int i = 0; i < len; i += 20) {
    unsigned int end = (i + 20 < len) ? i + 20 : len;
    String part = out.substring(i, end);
    txChar->setValue((uint8_t*)part.c_str(), part.length());
    txChar->notify();
    delay(4);
  }
}

int batteryPercent() {
  // 1S Li-ion through a 1:2 divider: 3.3 V (0 %) .. 4.2 V (100 %)
  float v = analogReadMilliVolts(PIN_BATTERY) * 2 / 1000.0f;
  return constrain((int)((v - 3.3f) / 0.9f * 100), 0, 100);
}

// ------------------------------------------------------------------ persistence
void loadSettings() {
  prefs.begin("fitbuddy", true);
  settings.mode = prefs.getChar("mode", 'W');
  settings.sedentaryMins = prefs.getInt("sed", 45);
  settings.postureSecs = prefs.getInt("pos", 60);
  settings.strict = prefs.getBool("strict", false);
  settings.hapticOn = prefs.getBool("hap", true);
  settings.intensity = prefs.getInt("int", 2);
  settings.confirmPulses = prefs.getBool("conf", true);
  prefs.getString("chl", settings.challenge, sizeof(settings.challenge));
  if (!settings.challenge[0]) strcpy(settings.challenge, "arm_circles");
  settings.challengeTarget = prefs.getInt("tgt", 10);
  for (int i = 0; i < EX_COUNT; i++) {
    String key = String("b") + i;
    calibrated[i] = prefs.getBytes(key.c_str(), &baselines[i], sizeof(Baseline)) == sizeof(Baseline);
    if (!calibrated[i]) baselines[i] = DEFAULT_BASELINES[i];
  }
  prefs.end();
}

void saveSettings() {
  prefs.begin("fitbuddy", false);
  prefs.putChar("mode", settings.mode);
  prefs.putInt("sed", settings.sedentaryMins);
  prefs.putInt("pos", settings.postureSecs);
  prefs.putBool("strict", settings.strict);
  prefs.putBool("hap", settings.hapticOn);
  prefs.putInt("int", settings.intensity);
  prefs.putBool("conf", settings.confirmPulses);
  prefs.putString("chl", settings.challenge);
  prefs.putInt("tgt", settings.challengeTarget);
  prefs.end();
}

void saveBaseline(int ex) {
  prefs.begin("fitbuddy", false);
  String key = String("b") + ex;
  prefs.putBytes(key.c_str(), &baselines[ex], sizeof(Baseline));
  prefs.end();
  calibrated[ex] = true;
}

// ------------------------------------------------------------------ commands from the app
void handleCommand(const String& line) {
  JsonDocument doc;
  if (deserializeJson(doc, line)) return;
  const char* c = doc["c"] | "";

  if (!strcmp(c, "cfg")) {
    if (doc["mode"].is<const char*>()) {
      char m = doc["mode"].as<const char*>()[0];
      if (m == 'S' && settings.mode != 'S') {  // entering study mode: current pose = upright
        gravityFromQuat(uprightGx, uprightGy, uprightGz);
      }
      settings.mode = m;
    }
    if (doc["sed"].is<int>()) settings.sedentaryMins = doc["sed"];
    if (doc["pos"].is<int>()) settings.postureSecs = doc["pos"];
    if (doc["strict"].is<int>()) settings.strict = doc["strict"].as<int>() == 1;
    if (doc["hap"].is<int>()) settings.hapticOn = doc["hap"].as<int>() == 1;
    if (doc["int"].is<int>()) settings.intensity = doc["int"];
    if (doc["conf"].is<int>()) settings.confirmPulses = doc["conf"].as<int>() == 1;
    if (doc["chl"].is<const char*>()) strlcpy(settings.challenge, doc["chl"], sizeof(settings.challenge));
    if (doc["tgt"].is<int>()) settings.challengeTarget = doc["tgt"];
    if (doc["ex"].is<const char*>()) {
      int ex = exerciseFromName(doc["ex"]);
      if (ex >= 0) settings.exerciseOverride = ex;
    }
    haptic.setEnabled(settings.hapticOn);
    haptic.setIntensity(settings.intensity);
    saveSettings();
  } else if (!strcmp(c, "base")) {
    int ex = exerciseFromName(doc["ex"] | "");
    if (ex >= 0 && ex < EX_COUNT) {
      baselines[ex] = {doc["rom"] | 0.0f, doc["rs"] | 2.0f, doc["tmp"] | 0.0f, doc["sw"] | 0.0f, doc["ss"] | 0.5f, doc["vel"] | 0.0f};
      saveBaseline(ex);
    }
  } else if (!strcmp(c, "calib")) {
    int ex = exerciseFromName(doc["ex"] | "");
    calibrating = (doc["on"] | 0) == 1 && ex >= 0 && ex < EX_COUNT;
    if (calibrating) calibExercise = ex;
  } else if (!strcmp(c, "hap")) {
    haptic.play(doc["p"] | "CONFIRM");
  } else if (!strcmp(c, "live")) {
    liveStream = (doc["on"] | 0) == 1;
  } else if (!strcmp(c, "rec")) {
    JsonArray steps = doc["steps"].as<JsonArray>();
    recCount = 0;
    for (JsonVariant v : steps) if (recCount < 10) recSteps[recCount++] = v.as<int>();
    recIndex = recCount ? 0 : -1;
    recStepStart = millis();
    if (recCount) haptic.play("STEP");
  }
}

// ------------------------------------------------------------------ BLE setup
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer*) override { bleConnected = true; }
  void onDisconnect(BLEServer* s) override {
    bleConnected = false;
    liveStream = false;
    s->startAdvertising();
  }
};

class RxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* ch) override {
    String v = ch->getValue();
    rxBuffer += v;
    int nl;
    while ((nl = rxBuffer.indexOf('\n')) >= 0) {
      String line = rxBuffer.substring(0, nl);
      rxBuffer = rxBuffer.substring(nl + 1);
      line.trim();
      if (line.length()) handleCommand(line);
    }
    if (rxBuffer.length() > 1024) rxBuffer = "";
  }
};

void setupBle() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_BT);
  char suffix[5];
  snprintf(suffix, sizeof(suffix), "%02X%02X", mac[4], mac[5]);
  deviceName = String(DEVICE_PREFIX) + suffix;

  BLEDevice::init(deviceName.c_str());
  BLEDevice::setMTU(185);
  bleServer = BLEDevice::createServer();
  bleServer->setCallbacks(new ServerCallbacks());
  BLEService* svc = bleServer->createService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
  txChar = svc->createCharacteristic("6e400003-b5a3-f393-e0a9-e50e24dcca9e", BLECharacteristic::PROPERTY_NOTIFY);
  txChar->addDescriptor(new BLE2902());
  BLECharacteristic* rx = svc->createCharacteristic("6e400002-b5a3-f393-e0a9-e50e24dcca9e",
                                                    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  rx->setCallbacks(new RxCallbacks());
  svc->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}

// ------------------------------------------------------------------ IMU
void enableReports() {
  bno.enableReport(SH2_GAME_ROTATION_VECTOR, IMU_INTERVAL_US);
  bno.enableReport(SH2_GYROSCOPE_CALIBRATED, IMU_INTERVAL_US);
  bno.enableReport(SH2_LINEAR_ACCELERATION, IMU_INTERVAL_US);
}

void readImu() {
  if (bno.wasReset()) enableReports();
  while (bno.getSensorEvent(&sensorValue)) {
    switch (sensorValue.sensorId) {
      case SH2_GAME_ROTATION_VECTOR:
        qw = sensorValue.un.gameRotationVector.real;
        qx = sensorValue.un.gameRotationVector.i;
        qy = sensorValue.un.gameRotationVector.j;
        qz = sensorValue.un.gameRotationVector.k;
        break;
      case SH2_GYROSCOPE_CALIBRATED: {
        float x = sensorValue.un.gyroscope.x, y = sensorValue.un.gyroscope.y, z = sensorValue.un.gyroscope.z;
        gyroDps = rad2deg(sqrtf(x * x + y * y + z * z));
        break;
      }
      case SH2_LINEAR_ACCELERATION: {
        float x = sensorValue.un.linearAcceleration.x, y = sensorValue.un.linearAcceleration.y, z = sensorValue.un.linearAcceleration.z;
        linAcc = sqrtf(x * x + y * y + z * z);
        break;
      }
    }
  }
}

// ------------------------------------------------------------------ rep pipeline
void onRepComplete(float rom, float tempo, float sway, float peakVel) {
  RepFeatures f = {EX_SQUAT, 1.0f, rom, tempo, sway, peakVel};
  if (calibrating) {
    f.exercise = calibExercise;
  } else if (settings.exerciseOverride != EX_AUTO) {
    f.exercise = settings.exerciseOverride;
  } else {
    f.exercise = classifyExercise(f, restGz, &f.confidence);
  }

  if (calibrating) {
    haptic.play("CONFIRM");  // "rep captured"
  } else {
    int score = 0;
    Quality q = scoreRep(f, baselines[f.exercise], settings.strict, &score);
    if (q == Q_POOR) haptic.play("ALERT");
    else if (q == Q_MODERATE) haptic.play("CORRECT");
    else if (settings.confirmPulses) haptic.play("CONFIRM");
  }

  JsonDocument doc;
  doc["t"] = "rep";
  doc["ex"] = EX_NAMES[f.exercise];
  doc["cf"] = roundf(f.confidence * 100) / 100;
  doc["rom"] = roundf(rom * 10) / 10;
  doc["tmp"] = (int)tempo;
  doc["sw"] = roundf(sway * 10) / 10;
  doc["vel"] = roundf(peakVel * 10) / 10;
  bleSend(doc);
}

void updateRep(unsigned long now) {
  float gx, gy, gz;
  gravityFromQuat(gx, gy, gz);
  float tilt = angleBetween(gx, gy, gz, restGx, restGy, restGz);

  if (repState == REP_IDLE) {
    // Track the resting pose while the user is still between reps
    if (gyroDps < STILL_GYRO_DPS) {
      if (!stillSince) stillSince = now;
      if (now - stillSince > 1500) { restGx = gx; restGy = gy; restGz = gz; }
    } else {
      stillSince = 0;
    }
    if (tilt > REP_START_DEG && !challengeActive) {
      repState = REP_MOVING;
      repStart = now;
      repMaxTilt = tilt;
      repPeakVel = gyroDps;
      repSwaySq = 0;
      repSwayN = 0;
      repRestRoll = rad2deg(atan2f(restGy, restGz));
    }
  } else {
    repMaxTilt = max(repMaxTilt, tilt);
    repPeakVel = max(repPeakVel, gyroDps);
    float dRoll = rollDeg() - repRestRoll;
    repSwaySq += dRoll * dRoll;
    repSwayN++;
    unsigned long dur = now - repStart;
    if (dur > REP_MAX_MS) {
      repState = REP_IDLE;  // not a rep (e.g. user sat down) — discard
    } else if (tilt < REP_END_DEG && dur > REP_MIN_MS) {
      repState = REP_IDLE;
      float sway = repSwayN ? sqrtf(repSwaySq / repSwayN) : 0;
      onRepComplete(repMaxTilt, dur, sway, repPeakVel);
    }
  }

  if (liveStream && bleConnected && now - lastRawSent > 100) {
    lastRawSent = now;
    JsonDocument doc;
    doc["t"] = "raw";
    doc["a"] = roundf(tilt * 10) / 10;
    doc["s"] = roundf((rollDeg() - rad2deg(atan2f(restGy, restGz))) * 10) / 10;
    bleSend(doc);
  }
}

// ------------------------------------------------------------------ anti-sedentary
void updateSedentary(unsigned long now) {
  bool moving = gyroDps > ACTIVE_GYRO_DPS || linAcc > ACTIVE_ACCEL_MS2;
  if (settings.mode == 'R') { lastActiveAt = now; return; }

  if (!challengeActive) {
    if (moving) lastActiveAt = now;
    if (now - lastActiveAt > (unsigned long)settings.sedentaryMins * 60000UL) {
      challengeActive = true;
      challengeStart = lastReminder = now;
      challengeCount = 0;
      haptic.play("SEDENTARY");
      JsonDocument doc;
      doc["t"] = "sed";
      doc["m"] = settings.sedentaryMins;
      doc["k"] = settings.challenge;
      doc["tgt"] = settings.challengeTarget;
      bleSend(doc);
    }
    return;
  }

  // Verify the challenge: count distinct movement peaks
  if (gyroDps > CHALLENGE_PEAK_DPS && !aboveThreshold && now - lastPeakAt > CHALLENGE_REFRACT_MS) {
    aboveThreshold = true;
    lastPeakAt = now;
    challengeCount++;
    JsonDocument doc;
    doc["t"] = "chl";
    if (challengeCount >= settings.challengeTarget) {
      challengeActive = false;
      lastActiveAt = now;
      haptic.play("CHALLENGE_DONE");
      doc["s"] = "done";
      doc["d"] = (int)((now - challengeStart) / 1000);
    } else {
      doc["s"] = "progress";
    }
    doc["n"] = challengeCount;
    doc["k"] = settings.challenge;
    doc["tgt"] = settings.challengeTarget;
    bleSend(doc);
  } else if (gyroDps < CHALLENGE_PEAK_DPS * 0.6f) {
    aboveThreshold = false;
  }

  if (challengeActive && now - lastReminder > CHALLENGE_REMIND_MS) {
    lastReminder = now;
    haptic.play("SEDENTARY");
  }
  if (challengeActive && now - challengeStart > CHALLENGE_TIMEOUT_MS) {
    challengeActive = false;
    lastActiveAt = now;
    JsonDocument doc;
    doc["t"] = "chl";
    doc["s"] = "fail";
    doc["n"] = challengeCount;
    doc["k"] = settings.challenge;
    bleSend(doc);
  }
}

// ------------------------------------------------------------------ posture (study mode)
void updatePosture(unsigned long now) {
  if (settings.mode != 'S') { slouchSince = 0; return; }
  float gx, gy, gz;
  gravityFromQuat(gx, gy, gz);
  float lean = angleBetween(gx, gy, gz, uprightGx, uprightGy, uprightGz);
  if (lean > POSTURE_SLOUCH_DEG) {
    if (!slouchSince) slouchSince = now;
    if (now - slouchSince > (unsigned long)settings.postureSecs * 1000UL) {
      haptic.play("POSTURE");
      JsonDocument doc;
      doc["t"] = "pos";
      doc["a"] = (int)lean;
      doc["s"] = settings.postureSecs;
      bleSend(doc);
      slouchSince = now;  // next nudge after another full interval
    }
  } else {
    slouchSince = 0;
  }
}

// ------------------------------------------------------------------ recovery
void updateRecovery(unsigned long now) {
  if (recIndex < 0) return;
  if (now - recStepStart >= (unsigned long)recSteps[recIndex] * 1000UL) {
    recIndex++;
    recStepStart = now;
    if (recIndex >= recCount) {
      recIndex = -1;
      haptic.play("CHALLENGE_DONE");
    } else {
      haptic.play("STEP");
    }
  }
}

// ------------------------------------------------------------------ Arduino
void setup() {
  Serial.begin(115200);
  haptic.begin(PIN_MOTOR);
  loadSettings();
  haptic.setEnabled(settings.hapticOn);
  haptic.setIntensity(settings.intensity);

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  if (!bno.begin_I2C(BNO08X_ADDR, &Wire)) {
    Serial.println("BNO08x not found — check wiring");
    while (true) { haptic.play("ALERT"); for (int i = 0; i < 100; i++) { haptic.update(); delay(10); } delay(2000); }
  }
  enableReports();
  setupBle();
  lastActiveAt = millis();
  haptic.play("CHALLENGE_DONE");  // boot chime
  Serial.printf("FitBuddy %s ready as %s\n", FW_VERSION, deviceName.c_str());
}

bool helloSent = false;

void loop() {
  unsigned long now = millis();
  readImu();
  if (settings.mode != 'R') updateRep(now);
  updateSedentary(now);
  updatePosture(now);
  updateRecovery(now);
  haptic.update();

  if (bleConnected && !helloSent) {
    delay(300);  // give the app time to subscribe to notifications
    JsonDocument doc;
    doc["t"] = "hello";
    doc["fw"] = FW_VERSION;
    doc["id"] = deviceName;
    doc["bat"] = batteryPercent();
    bleSend(doc);
    helloSent = true;
  }
  if (!bleConnected) helloSent = false;

  if (bleConnected && now - lastBattery > 60000) {
    lastBattery = now;
    JsonDocument doc;
    doc["t"] = "bat";
    doc["v"] = batteryPercent();
    bleSend(doc);
  }
}
