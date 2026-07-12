/* eslint-disable react/display-name */
import React from "react";
import {
  VisitTimelineCard,
} from "@/src/components/visits/VisitTimelineCard";

type VisitCardProps = {
  name: string;
  date: string;
  salon_name: string;
  profilePicture?: string | null;
  onPress: () => void;
  onPressIn?: () => void;
};

/** Visit row matching “View all visits”; avatar is pro on client lists, client on pro home. */
const VisitCard = React.memo(
  ({
    name,
    date,
    profilePicture,
    salon_name,
    onPress,
    onPressIn,
  }: VisitCardProps) => {
    const n = name.trim();
    const s = salon_name?.trim() ?? "";
    const subtitleLine = n && s ? `${n}, ${s}` : n || s || "—";

    return (
      <VisitTimelineCard
        avatarUri={profilePicture}
        dateLine={date}
        subtitleLine={subtitleLine}
        onPress={onPress}
        onPressIn={onPressIn}
      />
    );
  }
);

export default VisitCard;
