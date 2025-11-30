import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Profile, UserRoleType } from '@/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRoleType | null;
  loading: boolean;
  
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setRole: (role: UserRoleType | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  role: null,
  loading: true,
  
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setRole: (role) => set({ role }),
  
  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ session, user: session.user });
        
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        // Fetch role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        set({ 
          profile: profile || null, 
          role: roleData?.role || null,
          loading: false 
        });
      } else {
        set({ loading: false });
      }
      
      // Listen to auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ session, user: session?.user || null });
        
        if (session?.user) {
          // Defer profile fetch
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            set({ 
              profile: profile || null,
              role: roleData?.role || null 
            });
          }, 0);
        } else {
          set({ profile: null, role: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null, role: null });
  },
}));
