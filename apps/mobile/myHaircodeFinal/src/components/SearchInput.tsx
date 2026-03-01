import { Alert, StyleSheet, TextInput, View, Pressable } from "react-native";
import React, { useState, useEffect } from "react";
import { MagnifyingGlass, XCircle } from "phosphor-react-native";
import { Colors } from "../constants/Colors";
import { useIsFocused } from "@react-navigation/native";
import { 
  responsiveScale, 
  responsivePadding, 
  responsiveMargin,
  responsiveFontSize,
  responsiveBorderRadius,
  scalePercent 
} from "../utils/responsive";

type SearchInputProps = {
  initialQuery: string;
  onSearch: (query: string) => void;
  placeholder: string;
  style?: any;
  clearSearch?: () => void;
};

const SearchInput = ({
  initialQuery,
  onSearch,
  placeholder,
  style,
  clearSearch,
}: SearchInputProps) => {
  const [query, setQuery] = useState("");
  const isFocused = useIsFocused();

  useEffect(() => {
    onSearch(query);
  }, [query, onSearch]);

  useEffect(() => {
    if (isFocused) {
      setQuery("");
    }
  }, [isFocused]);

  const handleSearch = () => {
    if (!query) {
      return Alert.alert(
        "Missing query",
        "Please input something to search results across database"
      );
    }
    onSearch(query);
  };

  const handleBackspace = () => {
    setQuery((prev) => prev.slice(0, -1));
  };
  
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  return (
    <View style={[styles.container, style]}>
      <MagnifyingGlass
        size={responsiveScale(25)}
        color="#687076"
        style={styles.searchIcon}
      />
      <TextInput
        value={query}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#687076"
        onChangeText={(e) => setQuery(e)}
        onSubmitEditing={handleSearch}
      />

      {query !== "" && (
        <Pressable onPress={handleBackspace} style={styles.clearIcon}>
          <XCircle size={responsiveScale(24)} color="#687076" />
        </Pressable>
      )}
    </View>
  );
};

export default SearchInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.light.yellowish,
    marginHorizontal: responsivePadding(16),
    marginVertical: responsiveMargin(20),
    borderRadius: responsiveBorderRadius(30),
    alignItems: "center",
    paddingHorizontal: responsivePadding(10),
    width: scalePercent(93),
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    height: responsiveScale(45),
    minHeight: responsiveScale(40),
    paddingLeft: responsivePadding(10),
    paddingVertical: responsivePadding(10, 6),
    color: "#000",
    fontSize: responsiveFontSize(18, 14),
    fontFamily: "Inter-Regular",
  },
  searchIcon: {
    marginLeft: responsivePadding(10),
  },
  clearIcon: {
    marginRight: responsivePadding(10),
  },
});