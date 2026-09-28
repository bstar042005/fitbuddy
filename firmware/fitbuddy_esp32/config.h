// FitBuddy firmware configuration — edit pins to match your board.
#pragma once

#define FW_VERSION        "1.0.0"
#define DEVICE_PREFIX     "FitBuddy-"   // advertised as FitBuddy-XXXX (last 4 hex of MAC)

// --- Pins (ESP32 DevKit / ESP32-C3 SuperMini: adjust as needed)
#define PIN_I2C_SDA       21
#define PIN_I2C_SCL       22
#define PIN_BNO_RESET     -1            // -1 if not wired
#define PIN_MOTOR         18            // via NPN transistor/MOSFET + flyback diode
#define PIN_BATTERY       34            // battery via 100k/100k divider (ADC1 pin)

// --- IMU
#define BNO08X_ADDR       0x4A          // 0x4B if the ADR pad is bridged
#define IMU_INTERVAL_US   10000         // 100 Hz reports

// --- Rep segmentation (degrees of tilt away from the resting orientation)
#define REP_START_DEG     15.0f
#define REP_END_DEG       8.0f
#define REP_MIN_MS        400
#define REP_MAX_MS        6000

// --- Stillness / activity
#define STILL_GYRO_DPS    5.0f          // below this = still (for rest-pose update)
#define ACTIVE_GYRO_DPS   20.0f         // above this = the user is moving
#define ACTIVE_ACCEL_MS2  0.35f

// --- Challenge verification
#define CHALLENGE_PEAK_DPS 120.0f       // a "movement" = gyro peak above this
#define CHALLENGE_REFRACT_MS 350
#define CHALLENGE_REMIND_MS 60000
#define CHALLENGE_TIMEOUT_MS 180000

// --- Posture (study mode)
#define POSTURE_SLOUCH_DEG 15.0f
