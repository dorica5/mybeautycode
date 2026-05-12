import React from 'react'
import { Stack } from 'expo-router'
import { nativeStackHorizontalIOSLike } from '@/src/constants/nativeStackScreenOptions'

const _layout = () => {
  return (
    <Stack
    screenOptions={{
        headerShown: false,
        ...nativeStackHorizontalIOSLike,
      }}
    >
        <Stack.Screen name="GeneralSetup" />
        <Stack.Screen name="ChooseRole" />
        <Stack.Screen name="ChooseProfession" />
        <Stack.Screen name="AddProfession" />
        <Stack.Screen name="ProfessionalSetup" />
        <Stack.Screen name="ClientSetup" />
        <Stack.Screen name="FullName" />
        <Stack.Screen name="LoadingScreen" />
        <Stack.Screen name="PhoneNumber" />
        <Stack.Screen name="ProfilePicture" />
        <Stack.Screen name="TermsAndPrivacy" />
        <Stack.Screen name="Setup" />


    </Stack>
  )
}

export default _layout