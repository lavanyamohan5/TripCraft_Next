import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dummy user credentials for fallback
  const DUMMY_CREDENTIALS = {
    email: 'admin@tripcraft.com',
    password: '123456'
  };

  const DUMMY_USER = {
    id: '1',
    name: 'Lavanya Mohan',
    email: 'admin@tripcraft.com'
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined
        });
      } else {
        // Check for dummy user in localStorage as fallback
        const savedUser = localStorage.getItem('tripcraft_user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (error) {
            localStorage.removeItem('tripcraft_user');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Try Firebase authentication first
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      setUser({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || undefined
      });
      
      setIsLoading(false);
      return true;
    } catch (error) {
      // Fallback to dummy credentials
      if (email === DUMMY_CREDENTIALS.email && password === DUMMY_CREDENTIALS.password) {
        setUser(DUMMY_USER);
        localStorage.setItem('tripcraft_user', JSON.stringify(DUMMY_USER));
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update the user's display name
      await updateProfile(firebaseUser, {
        displayName: name
      });
      
      setUser({
        id: firebaseUser.uid,
        name: name,
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || undefined
      });
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      setUser({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || undefined
      });
      
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      // Handle specific Google auth errors
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User closed the popup');
      } else if (error.code === 'auth/popup-blocked') {
        console.log('Popup was blocked by browser');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('Popup request was cancelled');
      }
      
      setIsLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      localStorage.removeItem('tripcraft_user');
      setUser(null);
    } catch (error) {
      // Fallback for dummy user
      localStorage.removeItem('tripcraft_user');
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    loginWithGoogle,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};