import { createContext, useState, useEffect, useContext } from "react";
import { me } from "../services/conn";

// create a context
export const AuthContext = createContext(null);

/*
 - create a provider
 - fetched user from backend using me function(defined in conn.js)
 - stored it in a state
 - stored it in a context
 */
export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await me();
        setUser(res);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setUser(null);
      }
    }
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// made a function which directly gives the value of context
export const useAuth = () => useContext(AuthContext);
