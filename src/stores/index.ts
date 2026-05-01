import { create } from "zustand";

// ==========================================
// AUTH STORE
// ==========================================
interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: string[];
  departmentId?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isLoading: false }),
}));

// ==========================================
// SIDEBAR STORE
// ==========================================
interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (isCollapsed) => set({ isCollapsed }),
  setMobileOpen: (isMobileOpen) => set({ isMobileOpen }),
}));

// ==========================================
// NOTIFICATION STORE
// ==========================================
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  setNotifications: (notifications: NotificationItem[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: NotificationItem) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }),
  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      };
    }),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    })),
}));

// ==========================================
// PIPELINE STORE
// ==========================================
interface PipelineCandidate {
  id: string;
  applicationId: string;
  name: string;
  avatar?: string;
  position: string;
  score: number;
  appliedAt: string;
  stage: string;
  tags: string[];
}

interface PipelineState {
  candidates: Record<string, PipelineCandidate[]>;
  isLoading: boolean;
  setCandidates: (candidates: Record<string, PipelineCandidate[]>) => void;
  moveCandidate: (candidateId: string, fromStage: string, toStage: string, index: number) => void;
  setLoading: (loading: boolean) => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  candidates: {
    applied: [],
    screening: [],
    hr_interview: [],
    user_interview: [],
    final_interview: [],
    offer: [],
    hired: [],
  },
  isLoading: false,
  setCandidates: (candidates) => set({ candidates, isLoading: false }),
  moveCandidate: (candidateId, fromStage, toStage, index) =>
    set((state) => {
      const from = [...(state.candidates[fromStage] || [])];
      const to = fromStage === toStage ? from : [...(state.candidates[toStage] || [])];
      const candidateIndex = from.findIndex((c) => c.id === candidateId);
      if (candidateIndex === -1) return state;
      const [candidate] = from.splice(candidateIndex, 1);
      candidate.stage = toStage;
      if (fromStage === toStage) {
        from.splice(index, 0, candidate);
      } else {
        to.splice(index, 0, candidate);
      }
      return {
        candidates: {
          ...state.candidates,
          [fromStage]: from,
          [toStage]: fromStage === toStage ? from : to,
        },
      };
    }),
  setLoading: (isLoading) => set({ isLoading }),
}));
