const express = require('express');
const axios = require('axios');
const Emergency = require('../Models/emergency.model');
const User = require('../Models/user.model');
const auth = require('../middleware/auth');

const router = express.Router();

const reverseGeocode = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'sos-app' } });
    return data?.display_name || 'Unknown address';
  } catch {
    return 'Unknown address';
  }
};

router.post('/start', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const address = await reverseGeocode(latitude, longitude);

    let emergency = await Emergency.findOne({ userId: req.user.userId, isActive: true });
    if (emergency) {
      emergency.latitude = latitude;
      emergency.longitude = longitude;
      emergency.address = address;
      emergency.updatedAt = new Date();
      await emergency.save();
      return res.json({ message: 'Location updated', emergencyId: emergency._id });
    }

    emergency = await Emergency.create({
      userId: req.user.userId,
      name: req.user.name,
      email: req.user.email,
      latitude,
      longitude,
      address
    });

    const users = await User.find({ isVerified: true });
    const emails = users.map((u) => u.email);

    console.log('\n🚨 SOS ALERT');
    console.log(`From: ${req.user.name} (${req.user.email})`);
    console.log(`Coords: ${latitude}, ${longitude}`);
    console.log(`Address: ${address}`);
    console.log(`Notifying (${emails.length})`, emails);
    console.log('====================\n');

    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await Promise.all(
      emails.map((recipient) =>
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: recipient,
          subject: 'SOS Emergency Alert',
          html: `<p>${req.user.name} needs help.</p><p>${address}</p>`
        })
      )
    );
    */

    res.json({ message: 'SOS started', emergencyId: emergency._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/update', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const emergency = await Emergency.findOne({ userId: req.user.userId, isActive: true });
    if (!emergency) return res.status(404).json({ message: 'No active emergency' });

    emergency.latitude = latitude;
    emergency.longitude = longitude;
    emergency.address = await reverseGeocode(latitude, longitude);
    emergency.updatedAt = new Date();
    await emergency.save();

    console.log(`Location refreshed for ${req.user.email}: ${latitude}, ${longitude}`);
    res.json({ message: 'Location refreshed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/stop', auth, async (req, res) => {
  try {
    const emergency = await Emergency.findOne({ userId: req.user.userId, isActive: true });
    if (!emergency) return res.status(404).json({ message: 'No active emergency' });

    await Emergency.deleteOne({ _id: emergency._id });
    console.log(`SOS stopped for ${req.user.email}`);
    res.json({ message: 'SOS stopped' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/active', auth, async (_req, res) => {
  try {
    const emergencies = await Emergency.find({ isActive: true }).sort({ updatedAt: -1 });
    res.json(emergencies);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;