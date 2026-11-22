import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Bell, Check } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function StudentProfilePage() {
  const { student, user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNotifications((data as NotificationItem[]) || []));
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900">Academic Record Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Full Name</span>
            <span className="font-bold text-slate-900">{student?.full_name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Roll Number</span>
            <span className="font-mono font-bold">{student?.roll_number}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Hall Ticket Number</span>
            <span className="font-mono">{student?.hall_ticket_no || '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Section & Room</span>
            <span className="font-semibold">
              {student?.classes?.section_code} (Room {student?.classes?.room_no})
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Class Teacher</span>
            <span className="font-semibold">{student?.classes?.class_teacher}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Seat Category</span>
            <span className="font-semibold">{student?.seat_type}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#D9785D]" /> In-App Notifications
        </h3>
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border text-xs ${
                  n.is_read ? 'bg-slate-50 border-slate-200' : 'bg-orange-50/60 border-orange-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">{n.title}</p>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-[#D9785D] font-semibold flex items-center gap-0.5 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" /> Mark Read
                    </button>
                  )}
                </div>
                <p className="text-slate-600 mt-1">{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
