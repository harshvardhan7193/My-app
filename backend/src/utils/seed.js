import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Couple from '../models/Couple.js';
import Memory from '../models/Memory.js';
import Album from '../models/Album.js';
import Event from '../models/Event.js';
import Milestone from '../models/Milestone.js';
import RecapSlide from '../models/RecapSlide.js';
import Settings from '../models/Settings.js';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Couple.deleteMany({}),
      Memory.deleteMany({}),
      Album.deleteMany({}),
      Event.deleteMany({}),
      Milestone.deleteMany({}),
      RecapSlide.deleteMany({}),
      Settings.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create users
    const alex = await User.create({
      name: 'Alex Johnson',
      email: 'alex@example.com',
      password: 'love123',
      role: 'male',
      location: 'London, UK',
      birthday: new Date('1996-05-15'),
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
      mood: 'Happy 😊',
      bio: 'Adventure seeker and coffee lover.',
    });

    const sarah = await User.create({
      name: 'Sarah Wilson',
      email: 'sarah@example.com',
      password: 'love123',
      role: 'female',
      location: 'London, UK',
      birthday: new Date('1998-06-12'),
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop',
      mood: 'Feeling Loved 🥰',
      bio: 'Artist, dreamer, your favourite person.',
    });

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      location: 'HQ',
      bio: 'Application administrator.',
    });

    console.log('👤 Users created');

    // Create couple
    const couple = await Couple.create({
      maleUserId: alex._id,
      femaleUserId: sarah._id,
    });

    // Assign coupleId to both users
    await User.updateMany(
      { _id: { $in: [alex._id, sarah._id] } },
      { coupleId: couple._id }
    );

    // Admin shares the couple scope so couple-scoped admin endpoints work
    await User.updateOne({ _id: admin._id }, { coupleId: couple._id });

    console.log('💕 Couple created');

    // Create settings
    await Settings.create({
      coupleId: couple._id,
      anniversaryDate: new Date('2021-10-14'),
    });

    console.log('⚙️  Settings created');

    // Create memories
    const memories = [
      { title: 'Summer Walk', date: new Date('2024-07-15'), category: 'Dates', uploadedBy: sarah._id, favorite: true, img: 'https://picsum.photos/seed/love1/400/400' },
      { title: 'Coffee Date', date: new Date('2024-08-02'), category: 'Dates', uploadedBy: alex._id, favorite: false, img: 'https://picsum.photos/seed/love2/400/400' },
      { title: 'Beach Day', date: new Date('2024-09-10'), category: 'Trips', uploadedBy: sarah._id, favorite: true, img: 'https://picsum.photos/seed/love3/400/400' },
      { title: 'First Snow', date: new Date('2024-12-24'), category: 'Milestones', uploadedBy: alex._id, favorite: true, img: 'https://picsum.photos/seed/love4/400/400' },
      { title: 'City Lights', date: new Date('2025-01-05'), category: 'Favorites', uploadedBy: sarah._id, favorite: false, img: 'https://picsum.photos/seed/love5/400/400' },
      { title: 'Cozy Night In', date: new Date('2025-02-14'), category: 'Dates', uploadedBy: alex._id, favorite: true, img: 'https://picsum.photos/seed/love6/400/400' },
      { title: 'Rooftop Dinner', date: new Date('2025-03-20'), category: 'Favorites', uploadedBy: sarah._id, favorite: true, img: 'https://picsum.photos/seed/love7/400/400' },
      { title: 'Morning Hike', date: new Date('2025-04-10'), category: 'Trips', uploadedBy: alex._id, favorite: false, img: 'https://picsum.photos/seed/love8/400/400' },
    ];
    await Memory.insertMany(memories.map(m => ({ ...m, coupleId: couple._id })));
    console.log('📸 Memories created');

    // Create albums
    const albums = [
      {
        title: 'Summer in Bali',
        description: 'Our first big trip together. Memories from the beaches of Seminyak to the jungles of Ubud.',
        cover: 'https://picsum.photos/seed/bali1/400/500',
        date: new Date('2023-08-15'),
        createdBy: sarah._id,
        photos: Array.from({ length: 6 }, (_, i) => ({ img: `https://picsum.photos/seed/bali${i + 1}/400/400` })),
      },
      {
        title: 'First Home',
        description: 'The day we got the keys and the weeks of painting that followed.',
        cover: 'https://picsum.photos/seed/home1/400/500',
        date: new Date('2023-10-01'),
        createdBy: alex._id,
        photos: Array.from({ length: 4 }, (_, i) => ({ img: `https://picsum.photos/seed/home${i + 1}/400/400` })),
      },
      {
        title: 'Cozy Winter',
        description: 'Snowy days, hot cocoa, and many movie marathons.',
        cover: 'https://picsum.photos/seed/winter1/400/500',
        date: new Date('2023-12-20'),
        createdBy: sarah._id,
        photos: Array.from({ length: 3 }, (_, i) => ({ img: `https://picsum.photos/seed/winter${i + 1}/400/400` })),
      },
      {
        title: 'Our Dog: Milo',
        description: 'The best addition to our little family.',
        cover: 'https://picsum.photos/seed/dog1/400/500',
        date: new Date('2024-01-10'),
        createdBy: alex._id,
        photos: Array.from({ length: 5 }, (_, i) => ({ img: `https://picsum.photos/seed/dog${i + 1}/400/400` })),
      },
    ];
    await Album.insertMany(albums.map(a => ({ ...a, coupleId: couple._id })));
    console.log('📁 Albums created');

    // Create events
    const events = [
      { date: new Date('2026-10-14'), title: 'Anniversary Dinner ❤️', type: 'date', time: '8:00 PM', location: 'Nobu Restaurant' },
      { date: new Date('2026-06-22'), title: "Alex's Birthday", type: 'birthday', time: 'All Day', location: 'Home' },
      { date: new Date('2026-05-28'), title: 'Weekend Getaway', type: 'trip', time: '9:00 AM', location: 'Lake Como' },
      { date: new Date('2026-07-04'), title: 'Fireworks Night', type: 'date', time: '9:00 PM', location: 'Riverside Park' },
    ];
    await Event.insertMany(events.map(e => ({ ...e, coupleId: couple._id })));
    console.log('📅 Events created');

    // Create milestones
    const milestones = [
      { date: 'May 12, 2023', title: 'First Coffee Together', desc: 'The day everything started at that small cafe in Soho.', icon: 'Sparkles', color: '#FFB7C5', order: 0 },
      { date: 'Aug 15, 2023', title: 'Summer Trip to Bali', desc: 'Sunset dinners and ocean waves. Our first big trip together.', icon: 'MapPin', color: '#EBE8F3', order: 1 },
      { date: 'Oct 14, 2023', title: 'One Year Together', desc: 'Celebrated with a surprise rooftop dinner under the stars.', icon: 'Heart', color: '#F4D3D3', order: 2 },
      { date: 'Jan 01, 2024', title: 'New Year Promise', desc: 'Watching fireworks together and making plans for our future.', icon: 'Sparkles', color: '#D4AF37', order: 3 },
    ];
    await Milestone.insertMany(milestones.map(m => ({ ...m, coupleId: couple._id })));
    console.log('🏆 Milestones created');

    // Create recap slides
    const recapSlides = [
      { title: 'Our Beginning', subtitle: 'Where it all started...', img: 'https://picsum.photos/seed/recap1/400/600', order: 0 },
      { title: 'Summer Adventures', subtitle: 'The best trips of the year', img: 'https://picsum.photos/seed/recap2/400/600', order: 1 },
      { title: 'Building a Home', subtitle: 'Every small moment counts', img: 'https://picsum.photos/seed/recap3/400/600', order: 2 },
    ];
    await RecapSlide.insertMany(recapSlides.map(s => ({ ...s, coupleId: couple._id })));
    console.log('🎬 Recap slides created');

    console.log('\n✅ Database seeded successfully!');
    console.log(`\n   Login credentials:`);
    console.log(`   Male:   alex@example.com / love123`);
    console.log(`   Female: sarah@example.com / love123`);
    console.log(`   Admin:  admin@example.com / admin123\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
