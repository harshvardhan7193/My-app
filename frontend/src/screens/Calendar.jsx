import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, Heart } from 'lucide-react';
import api from '../utils/api';
import useFetchMe from '../hooks/useFetchMe';

const Calendar = () => {
  useFetchMe();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newEvent, setNewEvent] = useState({ title: '', type: 'date', location: '', time: '' });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const data = await api.getEvents();
        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching calendar events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day) => {
    setSelectedDate(new Date(year, month, day));
  };

  const isSameDate = (eventDateVal, d2) => {
    const d1 = new Date(eventDateVal);
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) return;

    try {
      const created = await api.createEvent({
        title: newEvent.title.trim(),
        type: newEvent.type,
        date: selectedDate.toISOString(),
        time: newEvent.time.trim() || '7:00 PM',
        location: newEvent.location.trim() || 'TBD'
      });
      setEvents(prev => [...prev, created]);
      setNewEvent({ title: '', type: 'date', location: '', time: '' });
      setShowAddEvent(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save event.');
    }
  };

  const renderCalendarDays = () => {
    const calendarDays = [];
    // Empty slots for previous month days
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} />);
    }
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const isSelected = isSameDate(dateObj, selectedDate);
      const hasEvent = events.find(e => isSameDate(e.date, dateObj));
      
      calendarDays.push(
        <motion.div 
          key={day} 
          whileTap={{ scale: 0.9 }}
          onClick={() => handleDateClick(day)}
          style={{ 
            height: '40px', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            position: 'relative',
            fontSize: '14px',
            fontWeight: isSelected ? 700 : 400,
            color: isSelected ? 'white' : 'var(--text-main)',
            backgroundColor: isSelected ? 'var(--blush-pink)' : 'transparent',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          {day}
          {hasEvent && !isSelected && (
            <div style={{ 
              position: 'absolute', 
              bottom: '4px', 
              width: '4px', 
              height: '4px', 
              borderRadius: '2px', 
              backgroundColor: hasEvent.type === 'date' ? 'var(--blush-pink)' : 'var(--elegant-gold)' 
            }} />
          )}
        </motion.div>
      );
    }
    return calendarDays;
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter(e => {
        const eventDate = new Date(e.date);
        const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return eventMidnight >= today;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  };

  const upcomingEvents = getUpcomingEvents();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '24px 20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', color: 'var(--text-main)' }}>Our Calendar</h2>
        <motion.div 
          whileTap={{ scale: 0.9 }} 
          onClick={() => setShowAddEvent(true)}
          style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '20px', 
            backgroundColor: 'var(--chat-bg)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer' 
          }}
        >
          <Plus size={24} color="var(--text-main)" />
        </motion.div>
      </div>

      <div className="premium-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div onClick={() => setShowYearPicker(!showYearPicker)} style={{ cursor: 'pointer' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              {months[month]} {year}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-sub)' }}>
            <ChevronLeft size={20} onClick={prevMonth} style={{ cursor: 'pointer' }} />
            <ChevronRight size={20} onClick={nextMonth} style={{ cursor: 'pointer' }} />
          </div>
        </div>

        {showYearPicker && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '8px', 
              marginBottom: '20px',
              padding: '12px',
              background: 'var(--chat-bg)',
              borderRadius: '16px'
            }}
          >
            {Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - 4 + i).map(y => (
              <div 
                key={y} 
                onClick={() => {
                  setCurrentDate(new Date(y, month, 1));
                  setShowYearPicker(false);
                }}
                style={{ 
                  padding: '8px', 
                  fontSize: '12px', 
                  textAlign: 'center', 
                  borderRadius: '8px',
                  background: y === year ? 'var(--blush-pink)' : 'var(--card-bg)',
                  color: y === year ? 'white' : 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                {y}
              </div>
            ))}
          </motion.div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', textAlign: 'center', marginBottom: '12px' }}>
          {days.map((d, i) => (
            <span key={i} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)' }}>{d}</span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', textAlign: 'center' }}>
          {renderCalendarDays()}
        </div>
      </div>

      <h4 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-main)' }}>
        Plans for {months[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {events.filter(e => isSameDate(e.date, selectedDate)).length > 0 ? (
          events.filter(e => isSameDate(e.date, selectedDate)).map((event) => (
            <motion.div 
              key={event.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card" 
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                backgroundColor: event.type === 'date' ? 'var(--card-accent-pink)' : 'var(--card-accent-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none'
              }}>
                <Heart size={20} color={event.type === 'date' ? 'var(--blush-pink)' : 'var(--text-main)'} fill={event.type === 'date' ? 'var(--blush-pink)' : 'none'} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{event.title}</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {event.time}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> {event.location}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="premium-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-sub)' }}>
            <p style={{ fontSize: '14px' }}>No plans for this day yet.</p>
            <p 
              onClick={() => setShowAddEvent(true)}
              style={{ color: 'var(--blush-pink)', fontSize: '12px', fontWeight: 600, marginTop: '8px', cursor: 'pointer' }}
            >
              + Add something special
            </p>
          </div>
        )}
      </div>

      {/* Upcoming Plans Section */}
      <div style={{ marginTop: '40px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-main)' }}>Upcoming Plans</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => {
              const eventDate = new Date(event.date);
              const day = eventDate.getDate();
              const monthAbbrev = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
              
              return (
                <motion.div
                  key={event._id || event.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedDate(eventDate);
                    setCurrentDate(eventDate);
                  }}
                  className="premium-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    cursor: 'pointer'
                  }}
                >
                  {/* Calendar style date badge */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--card-accent-purple)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-sub)',
                      letterSpacing: '0.05em',
                      lineHeight: '1.2'
                    }}>
                      {monthAbbrev}
                    </span>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      lineHeight: '1.1'
                    }}>
                      {day}
                    </span>
                  </div>
                  
                  {/* Event Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: '4px'
                    }}>
                      {event.title}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {event.time && (
                        <span style={{ fontSize: '11px', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {event.time}
                        </span>
                      )}
                      {event.location && (
                        <span style={{ fontSize: '11px', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div
              className="premium-card"
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-sub)',
                border: '2px dashed var(--dusty-rose)'
              }}
            >
              <p style={{ fontSize: '14px' }}>No upcoming plans scheduled.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}
          >
            <div 
              style={{ position: 'absolute', inset: 0 }} 
              onClick={() => setShowAddEvent(false)} 
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              style={{ width: '100%', background: 'var(--menu-bg)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '32px 24px 60px 24px', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '22px', color: 'var(--text-main)' }}>Add New Plan</h3>
                <X onClick={() => setShowAddEvent(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>What are we doing?</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Picnic, Movie Night..." 
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--chat-bg)',
                      fontSize: '15px',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontFamily: 'var(--font-main)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>Type</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['date', 'trip', 'milestone'].map(t => (
                      <span 
                        key={t}
                        onClick={() => setNewEvent({ ...newEvent, type: t })}
                        style={{ 
                          padding: '10px 20px', 
                          borderRadius: '100px', 
                          background: newEvent.type === t ? 'var(--dusty-rose)' : 'var(--chat-bg)',
                          color: newEvent.type === t ? 'white' : 'var(--text-sub)',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>Time</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 8:00 PM or All Day" 
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '16px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--chat-bg)',
                        fontSize: '15px',
                        color: 'var(--text-main)',
                        outline: 'none',
                        fontFamily: 'var(--font-main)'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Positano, Italy" 
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '16px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--chat-bg)',
                        fontSize: '15px',
                        color: 'var(--text-main)',
                        outline: 'none',
                        fontFamily: 'var(--font-main)'
                      }}
                    />
                  </div>
                </div>

                <button onClick={handleAddEvent} className="btn-primary" style={{ width: '100%', marginTop: '12px', border: 'none' }}>Save Moment</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Calendar;
