import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useState,
} from "react";

type SetupContextProp = {
  phoneNumber: string;
  setPhoneNumber: React.Dispatch<React.SetStateAction<string>>;
  salonPhoneNumber: string;
  setSalonPhoneNumber: React.Dispatch<React.SetStateAction<string>>;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  profilePicture: string | null;
  setProfilePicture: React.Dispatch<React.SetStateAction<string | null>>;
  hair_type: string;
  setHairType: React.Dispatch<React.SetStateAction<string>>;
};

const SetupContext = createContext<SetupContextProp | undefined>(undefined);

export const useSetup = (): SetupContextProp => {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error("useSetup must be used within a SetupProvider");
  }
  return context;
};

export const SetupProvider = ({ children }: PropsWithChildren) => {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [salonPhoneNumber, setSalonPhoneNumber] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [hair_type, setHairType] = useState<string>("");

  return (
    <SetupContext.Provider
      value={{
        phoneNumber,
        setPhoneNumber,
        salonPhoneNumber,
        setSalonPhoneNumber,
        name,
        setName,
        profilePicture,
        setProfilePicture,
        hair_type,
        setHairType,
      }}
    >
      {children}
    </SetupContext.Provider>
  );
};