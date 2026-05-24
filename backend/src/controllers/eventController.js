import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendPushToPartner } from '../services/notificationService.js';

export const getEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ coupleId: req.coupleId }).sort({ date: 1 });
  res.json(events);
});

export const createEvent = asyncHandler(async (req, res) => {
  const event = await Event.create({ ...req.body, coupleId: req.coupleId });

  const senderName = req.user.name || 'your partner';
  await sendPushToPartner(req.user._id, req.coupleId, {
    title: `📅 New event: ${event.title}`,
    body: `Scheduled for ${new Date(event.date).toLocaleDateString()}`,
    data: { url: `/calendar` }
  }, 'events');

  res.status(201).json(event);
});

export const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findOneAndUpdate({ _id: req.params.id, coupleId: req.coupleId }, req.body, { new: true });
  if (!event) { res.status(404); throw new Error('Event not found'); }
  res.json(event);
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findOneAndDelete({ _id: req.params.id, coupleId: req.coupleId });
  if (!event) { res.status(404); throw new Error('Event not found'); }
  res.json({ message: 'Event deleted' });
});
