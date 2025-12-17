import React, { createContext, ReactNode, useContext, useState } from "react";

type SensorContextType = {
  timeOfDay: string;
  setTimeOfDay: (time: string) => void;
  environment: string;
  setEnvironment: (env: string) => void;
  locationName: string;
  setLocationName: (loc: string) => void;
  userAction: string;
  setUserAction: (action: string) => void;
};

const SensorContext = createContext<SensorContextType | undefined>(undefined);

export function SensorProvider({ children }: { children: ReactNode }) {
  const [timeOfDay, setTimeOfDay] = useState("Day");
  const [environment, setEnvironment] = useState("Indoors");
  const [locationName, setLocationName] = useState("Unknown");
  const [userAction, setUserAction] = useState("Stationary");

  return (
    <SensorContext.Provider
      value={{
        timeOfDay,
        setTimeOfDay,
        environment,
        setEnvironment,
        locationName,
        setLocationName,
        userAction,
        setUserAction,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
}

export function useSensor() {
  const context = useContext(SensorContext);
  if (context === undefined) {
    throw new Error("useSensor must be used within a SensorProvider");
  }
  return context;
}
