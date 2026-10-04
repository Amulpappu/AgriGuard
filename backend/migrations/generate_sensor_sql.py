import sqlite3

conn = sqlite3.connect("backend/agriguard.db")
cur = conn.cursor()
rows = cur.execute("SELECT id, device_id, soil_moisture, temp_c, humidity, recorded_at FROM sensor_readings").fetchall()

lines = []
lines.append("DROP TABLE IF EXISTS sensor_readings CASCADE;")
lines.append("""CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(36),
    soil_moisture DOUBLE PRECISION NOT NULL,
    temp_c DOUBLE PRECISION NOT NULL,
    humidity DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sensor_recorded_at ON sensor_readings(recorded_at);
""")

for r in rows:
    rid, did, sm, tc, hum, rec = r
    did_str = f"'{did}'" if did else "NULL"
    lines.append(f"INSERT INTO sensor_readings (device_id, soil_moisture, temp_c, humidity, recorded_at) VALUES ({did_str}, {sm}, {tc}, {hum}, '{rec}');")

with open("populate_sensor_readings.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print(f"Wrote {len(rows)} sensor rows to populate_sensor_readings.sql")
