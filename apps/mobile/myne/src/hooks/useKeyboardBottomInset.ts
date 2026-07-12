import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Bottom inset matching keyboard height while visible (0 when hidden). */
export function useKeyboardBottomInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, (e) =>
      setInset(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(hideEvent, () => setInset(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
