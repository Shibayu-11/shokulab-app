// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期セッション取得
    getInitialSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // ユーザーがサインアップした場合、food_lab_usersテーブルにプロフィール作成
      if (event === 'SIGNED_UP' && session?.user) {
        await createUserProfile(session.user);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getInitialSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  };

  const createUserProfile = async (user) => {
    const { error } = await supabase
      .from('food_lab_users')
      .insert([
        {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || null,
        }
      ]);
    
    if (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp: async (email, password, name) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      return { data, error };
    },
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      return { error };
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};