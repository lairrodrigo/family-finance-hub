import React, { createContext, useContext, useEffect, useState } from "react";

interface SettingsContextType {
  showValues: boolean;
  toggleShowValues: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showValues, setShowValues] = useState<boolean>(() => {
    const saved = localStorage.getItem("showValues");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("showValues", JSON.stringify(showValues));
  }, [showValues]);

  const toggleShowValues = () => {
    setShowValues((prev) => !prev);
  };

  return (
    <SettingsContext.Provider value={{ showValues, toggleShowValues }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
