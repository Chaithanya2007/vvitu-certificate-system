import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { StudentRecord, UserProfile } from '../types/database';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  student: StudentRecord | null;
  loading: boolean;
  isStaff: boolean;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserRecords = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setStudent(null);
      setLoading(false);
      return;
    }

    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      setProfile(profileData as UserProfile | null);

      if (!profileData || profileData.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('*, classes(*)')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        setStudent(studentData as StudentRecord | null);
      } else {
        setStudent(null);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      loadUserRecords(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      loadUserRecords(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUserData = async () => {
    await loadUserRecords(user);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setStudent(null);
  };

  const isStaff = Boolean(
    profile && ['admin', 'registrar', 'department_approver'].includes(profile.role)
  );

  return (
    <AuthContext.Provider
      value={{ session, user, profile, student, loading, isStaff, refreshUserData, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
