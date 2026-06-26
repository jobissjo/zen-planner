import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Task, User } from "../types";

const STORAGE_KEY = "weekly_planner_db_v1";

interface DB {
  users: User[];
  tasks: Task[];
}

const seedUsers: User[] = [
  {
    id: "u_admin",
    name: "Alex Admin",
    email: "admin@demo.com",
    role: "admin",
    streakCount: 12,
    streakFreezes: 3,
  },
  {
    id: "u_user",
    name: "Sam User",
    email: "user@demo.com",
    role: "user",
    streakCount: 5,
    streakFreezes: 2,
  },
];

function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const seedTasks: any[] = [
  {
    id: "t1", userId: "u_user", title: "Morning workout",
    description: "30 min run", date: today(0), startTime: "07:00", endTime: "07:30",
    priority: "high", isOptional: false, status: "completed",
    createdAt: new Date().toISOString(),
  },
  {
    id: "t2", userId: "u_user", title: "Deep work: design system",
    date: today(0), startTime: "09:00", endTime: "11:00",
    priority: "high", isOptional: false, status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: "t3", userId: "u_user", title: "Read a chapter",
    date: today(0), startTime: "20:00", endTime: "20:30",
    priority: "low", isOptional: true, status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: "t4", userId: "u_user", title: "Team standup",
    date: today(1), startTime: "10:00", endTime: "10:15",
    priority: "medium", isOptional: false, status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: "t5", userId: "u_user", title: "Plan next sprint",
    date: today(2), startTime: "14:00", endTime: "15:00",
    priority: "high", isOptional: false, status: "pending",
    createdAt: new Date().toISOString(),
  },
];

let inMemoryDb: DB = { users: seedUsers, tasks: seedTasks };

// Async preload
if (typeof window !== "undefined") {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        try {
          inMemoryDb = JSON.parse(raw) as DB;
        } catch {}
      } else {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryDb)).catch(() => {});
      }
    })
    .catch((err) => {
      console.warn("AsyncStorage is not available. Using in-memory storage.", err);
    });
}


export const mockDb = {
  load(): DB {
    return inMemoryDb;
  },
  async save(db: DB) {
    inMemoryDb = db;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (err) {
      console.warn("Failed to save to AsyncStorage:", err);
    }
  },
  async reset() {
    inMemoryDb = { users: seedUsers, tasks: seedTasks };
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Failed to reset AsyncStorage:", err);
    }
  },
};

