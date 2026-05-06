import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name: string;
  avatar?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  registeredUsers: User[];
  login: (email: string, password: string) => { success: boolean; message?: string };
  register: (name: string, email: string, password: string) => { success: boolean; message?: string };
  updateProfile: (data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const DEFAULT_ADMIN: User = {
    id: 'admin-001',
    email: 'ceo@pallywear.com',
    role: 'admin',
    name: 'Admin',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=3291B6&color=fff',
    createdAt: new Date('2024-01-01').toISOString()
  };

  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('registeredUsers');
    let users: User[] = saved ? JSON.parse(saved) : [DEFAULT_ADMIN];

    // Ensure the default admin exists and has the correct role
    const adminIndex = users.findIndex(u => u.email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase());
    if (adminIndex === -1) {
      users.push(DEFAULT_ADMIN);
    } else {
      users[adminIndex] = { ...users[adminIndex], role: 'admin' };
    }

    return users;
  });

  // For demo/simplicity, we'll also store passwords in a separate local storage key
  // In a real app, this would be on a secure server
  const [userCredentials, setUserCredentials] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('userCredentials');
    const creds = saved ? JSON.parse(saved) : { [DEFAULT_ADMIN.email]: 'Ceo@pallywear24' };

    // Ensure default admin credentials exist
    if (!creds[DEFAULT_ADMIN.email]) {
      creds[DEFAULT_ADMIN.email] = 'Ceo@pallywear24';
    }

    return creds;
  });

  useEffect(() => {
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    localStorage.setItem('userCredentials', JSON.stringify(userCredentials));
  }, [userCredentials]);

  useEffect(() => {
    if (user) {
      const normalizedEmail = user.email.toLowerCase();
      const isAdminEmail = normalizedEmail === 'ceo@pallywear.com' || normalizedEmail.startsWith('admin') || normalizedEmail.startsWith('ceo');

      if (isAdminEmail && user.role !== 'admin') {
        const updatedUser = { ...user, role: 'admin' as const };
        setUser(updatedUser);
        setRegisteredUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('currentUser');
    }
  }, [user]);

  // Safeguard: If the current user is deleted from registeredUsers (e.g., by an admin), log them out
  useEffect(() => {
    if (user) {
      const userExists = registeredUsers.some(u => u.id === user.id);
      if (!userExists) {
        logout();
      }
    }
  }, [registeredUsers, user]);

  const login = (email: string, password: string) => {
    let normalizedEmail = email.toLowerCase();

    // Support 'admin' shorthand for the default admin email
    if (normalizedEmail === 'admin') {
      normalizedEmail = 'ceo@pallywear.com';
    }

    const storedPassword = userCredentials[normalizedEmail];

    if (!storedPassword || storedPassword !== password) {
      return { success: false, message: 'Invalid email or password' };
    }

    const foundUser = registeredUsers.find(u => u.email.toLowerCase() === normalizedEmail);
    if (foundUser) {
      // Force admin role if email matches admin criteria
      const isAdminEmail = normalizedEmail === 'ceo@pallywear.com' || normalizedEmail.startsWith('admin') || normalizedEmail.startsWith('ceo');
      const userToSet = isAdminEmail ? { ...foundUser, role: 'admin' as const } : foundUser;

      setUser(userToSet);

      // Update registered users if role was corrected
      if (isAdminEmail && foundUser.role !== 'admin') {
        setRegisteredUsers(prev => prev.map(u => u.id === foundUser.id ? userToSet : u));
      }

      return { success: true };
    }

    return { success: false, message: 'User record not found' };
  };

  const register = (name: string, email: string, password: string) => {
    const normalizedEmail = email.toLowerCase();

    if (userCredentials[normalizedEmail]) {
      return { success: false, message: 'Email already registered' };
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email: normalizedEmail,
      role: normalizedEmail === 'ceo@pallywear.com' || normalizedEmail.startsWith('admin') || normalizedEmail.startsWith('ceo') ? 'admin' : 'user',
      name,
      avatar: `https://ui-avatars.com/api/?name=${name}&background=3291B6&color=fff`,
      createdAt: new Date().toISOString()
    };

    setRegisteredUsers(prev => [...prev, newUser]);
    setUserCredentials(prev => ({ ...prev, [normalizedEmail]: password }));
    setUser(newUser);

    return { success: true };
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      setRegisteredUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    }
  };

  const deleteUser = (id: string) => {
    setRegisteredUsers(prev => prev.filter(u => u.id !== id));

    // Also remove from credentials
    const userToDelete = registeredUsers.find(u => u.id === id);
    if (userToDelete) {
      const newCreds = { ...userCredentials };
      delete newCreds[userToDelete.email.toLowerCase()];
      setUserCredentials(newCreds);
    }

    if (user?.id === id) {
      logout();
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{
      user,
      registeredUsers,
      login,
      register,
      logout,
      updateProfile,
      deleteUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
