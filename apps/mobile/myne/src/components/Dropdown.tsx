import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { Colors } from "../constants/Colors";

const Dropdown = ({ onSelect, listMode, initialValue = null, zIndex, zIndexInverse, item }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [items, setItems] = useState(item);

  return (
    <View style={[styles.container, { zIndex: open ? zIndex : zIndexInverse }]}>
      <DropDownPicker
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={setValue}
        setItems={setItems}
        placeholder= {value}
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        textStyle={styles.text}
        listMode={listMode}
        onChangeValue={(value) => {
          onSelect(value);
        }}
      />
    </View>
  );
};

export default Dropdown;

const styles = StyleSheet.create({
  container: {
    marginBottom: 20, 
  },
  dropdown: {
    backgroundColor: Colors.dark.yellowish,
    borderColor: Colors.dark.warmGreen,
    borderWidth: 2,
    borderRadius: 20,
    height: 50,
    paddingHorizontal: "8%",
  },
  dropdownContainer: {
    backgroundColor: "#ffffff",
    borderColor: "#a9a9a9",
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    color: "#333333",
    fontFamily: "Inter-SemiBold",
  },
});
