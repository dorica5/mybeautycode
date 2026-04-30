import {  useEffect } from "react";
import {
  StyleSheet,
} from "react-native";
import { Href, router,} from "expo-router";

const Index = () => {
  useEffect(() => {
    console.log("Redirecting to inspiration");
    router.replace("inspiration" as Href);
  }, []);
};
export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resultsContainer: {
    paddingHorizontal: 20,
  },
  viewContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignContent: "space-between",
  },
  text: {
    marginTop: "0%",
    padding: "5%",
    fontSize: 15,
    fontFamily: "Regular",
    borderRadius: 20,
  },
});