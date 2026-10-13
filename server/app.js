
const express = require('express');
const path = require('path');
const { ObjectId } = require('mongodb');
const { connectDB, getDB } = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// ตรวจสอบ MongoDB ObjectId
function toObjectId(id) {
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return null;
    }
    return new ObjectId(id);
}

// ตรวจสอบและจัดรูปแบบข้อมูลกิจกรรม
function validateEvent(body) {
    const title = body.title?.trim();
    const description = body.description?.trim();
    const date = body.date;
    const time = body.time;
    const location = body.location?.trim();
    const capacity = Number(body.capacity);

    if (!title || !description || !date || !time || !location) {
        return { error: 'กรุณากรอกข้อมูลกิจกรรมให้ครบ' };
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !/^\d{2}:\d{2}$/.test(time)
    ) {
        return { error: 'รูปแบบวันที่หรือเวลาไม่ถูกต้อง' };
    }

    const dateObj = new Date(date + 'T00:00:00Z');

    if (
        Number.isNaN(dateObj.getTime()) ||
        dateObj.toISOString().slice(0, 10) !== date
    ) {
        return { error: 'วันที่ไม่ถูกต้อง' };
    }

    const [hour, minute] = time.split(':').map(Number);

    if (hour > 23 || minute > 59) {
        return { error: 'เวลาไม่ถูกต้อง' };
    }

    if (
        !Number.isInteger(capacity) ||
        capacity < 1 ||
        capacity > 10000
    ) {
        return {
            error: 'จำนวนที่นั่งต้องเป็นจำนวนเต็ม 1-10000'
        };
    }

    return {
        data: {
            title,
            description,
            date,
            time,
            location,
            capacity
        }
    };
}

// ==========================================
// TEST API
// ==========================================

app.get('/api/test', async (req, res) => {
    await getDB().command({ ping: 1 });

    res.json({
        success: true,
        message: 'LUXE EVENT API is working!',
        database: 'MongoDB Connected'
    });
});

// ==========================================
// EVENT CRUD
// ==========================================

// GET - ดูกิจกรรมทั้งหมด
app.get('/api/events', async (req, res) => {
    const events = await getDB()
        .collection('events')
        .find()
        .sort({ date: 1, time: 1 })
        .toArray();

    res.json(events);
});

// GET - ดูกิจกรรมตาม ID
app.get('/api/events/:id', async (req, res) => {
    const id = toObjectId(req.params.id);

    if (!id) {
        return res.status(400).json({
            error: 'Event ID ไม่ถูกต้อง'
        });
    }

    const event = await getDB()
        .collection('events')
        .findOne({ _id: id });

    if (!event) {
        return res.status(404).json({
            error: 'ไม่พบกิจกรรม'
        });
    }

    res.json(event);
});

// POST - เพิ่มกิจกรรม
app.post('/api/events', async (req, res) => {
    const result = validateEvent(req.body);

    if (result.error) {
        return res.status(400).json({
            error: result.error
        });
    }

    const event = {
        ...result.data,
        registeredCount: 0,
        createdAt: new Date()
    };

    const inserted = await getDB()
        .collection('events')
        .insertOne(event);

    res.status(201).json({
        message: 'สร้างกิจกรรมสำเร็จ',
        event: {
            _id: inserted.insertedId,
            ...event
        }
    });
});

// PUT - แก้ไขกิจกรรม
app.put('/api/events/:id', async (req, res) => {
    const id = toObjectId(req.params.id);

    if (!id) {
        return res.status(400).json({
            error: 'Event ID ไม่ถูกต้อง'
        });
    }

    const result = validateEvent(req.body);

    if (result.error) {
        return res.status(400).json({
            error: result.error
        });
    }

    const events = getDB().collection('events');

    // ไม่ให้ลดจำนวนที่นั่งต่ำกว่าคนที่สมัครแล้ว
    const updated = await events.updateOne(
        {
            _id: id,
            registeredCount: {
                $lte: result.data.capacity
            }
        },
        {
            $set: result.data
        }
    );

    if (updated.matchedCount === 0) {
        const exists = await events.findOne({ _id: id });

        if (!exists) {
            return res.status(404).json({
                error: 'ไม่พบกิจกรรม'
            });
        }

        return res.status(400).json({
            error: 'จำนวนที่นั่งน้อยกว่าจำนวนผู้ลงทะเบียน'
        });
    }

    res.json({
        message: 'แก้ไขกิจกรรมสำเร็จ'
    });
});

// DELETE - ลบกิจกรรม
app.delete('/api/events/:id', async (req, res) => {
    const id = toObjectId(req.params.id);

    if (!id) {
        return res.status(400).json({
            error: 'Event ID ไม่ถูกต้อง'
        });
    }

    const db = getDB();

    const result = await db.collection('events')
        .deleteOne({ _id: id });

    if (result.deletedCount === 0) {
        return res.status(404).json({
            error: 'ไม่พบกิจกรรม'
        });
    }

    // ลบผู้ลงทะเบียนที่เกี่ยวข้องด้วย
    await db.collection('registrations')
        .deleteMany({ eventId: id });

    res.json({
        message: 'ลบกิจกรรมสำเร็จ'
    });
});

// ==========================================
// REGISTRATION SYSTEM
// ==========================================

// POST - ลงทะเบียนเข้าร่วมกิจกรรม
app.post('/api/events/:id/register', async (req, res) => {
    const eventId = toObjectId(req.params.id);

    if (!eventId) {
        return res.status(400).json({
            error: 'Event ID ไม่ถูกต้อง'
        });
    }

    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();

    if (!name || !email) {
        return res.status(400).json({
            error: 'กรุณากรอกชื่อและอีเมล'
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            error: 'รูปแบบอีเมลไม่ถูกต้อง'
        });
    }

    const db = getDB();
    const events = db.collection('events');
    const registrations = db.collection('registrations');

    // จองที่นั่งเมื่อกิจกรรมยังไม่เต็มเท่านั้น
    const reserved = await events.findOneAndUpdate(
        {
            _id: eventId,
            $expr: {
                $lt: ['$registeredCount', '$capacity']
            }
        },
        {
            $inc: { registeredCount: 1 }
        },
        {
            returnDocument: 'after'
        }
    );

    if (!reserved) {
        const event = await events.findOne({ _id: eventId });

        return res.status(event ? 400 : 404).json({
            error: event
                ? 'กิจกรรมนี้เต็มแล้ว'
                : 'ไม่พบกิจกรรม'
        });
    }

    try {
        const registration = {
            eventId,
            name,
            email,
            registeredAt: new Date()
        };

        const inserted = await registrations
            .insertOne(registration);

        res.status(201).json({
            message: 'ลงทะเบียนสำเร็จ',
            registration: {
                _id: inserted.insertedId,
                ...registration
            }
        });

    } catch (error) {
        // คืนที่นั่ง ถ้าบันทึกการลงทะเบียนไม่สำเร็จ
        await events.updateOne(
            { _id: eventId },
            { $inc: { registeredCount: -1 } }
        );

        if (error.code === 11000) {
            return res.status(409).json({
                error: 'อีเมลนี้ลงทะเบียนกิจกรรมนี้แล้ว'
            });
        }

        throw error;
    }
});

// GET - ดูรายชื่อผู้ลงทะเบียน
app.get('/api/events/:id/registrations', async (req, res) => {
    const eventId = toObjectId(req.params.id);

    if (!eventId) {
        return res.status(400).json({
            error: 'Event ID ไม่ถูกต้อง'
        });
    }

    const db = getDB();
    const event = await db.collection('events')
        .findOne({ _id: eventId });

    if (!event) {
        return res.status(404).json({
            error: 'ไม่พบกิจกรรม'
        });
    }

    const registrations = await db
        .collection('registrations')
        .find({ eventId })
        .sort({ registeredAt: -1 })
        .toArray();

    res.json(registrations);
});

// DELETE - ยกเลิกการลงทะเบียน
app.delete('/api/registrations/:id', async (req, res) => {
    const id = toObjectId(req.params.id);

    if (!id) {
        return res.status(400).json({
            error: 'Registration ID ไม่ถูกต้อง'
        });
    }

    const db = getDB();

    const registration = await db
        .collection('registrations')
        .findOneAndDelete({ _id: id });

    if (!registration) {
        return res.status(404).json({
            error: 'ไม่พบการลงทะเบียน'
        });
    }

    await db.collection('events').updateOne(
        { _id: registration.eventId },
        { $inc: { registeredCount: -1 } }
    );

    res.json({
        message: 'ยกเลิกการลงทะเบียนสำเร็จ'
    });
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    });
});

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
    try {
        const db = await connectDB();

        // ป้องกันอีเมลซ้ำในกิจกรรมเดียวกัน
        await db.collection('registrations').createIndex(
            { eventId: 1, email: 1 },
            { unique: true }
        );

        app.listen(PORT, () => {
            console.log('================================');
            console.log('  LUXE EVENT SERVER IS RUNNING');
            console.log('================================');
            console.log(`http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Server Error:', error.message);
        process.exit(1);
    }
}

startServer();
