/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { initClient } from '@ts-rest/core';
import { contract } from '@trail-mate/api-types';

const client = initClient(contract, {
  baseUrl: 'http://10.0.0.186:3000',
  baseHeaders: {},
});

export const App = () => {
  const scrollViewRef = useRef<null | ScrollView>(null);

  client.getTracks().then((res) => {
    console.log(res);
  });

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          ref={(ref) => {
            scrollViewRef.current = ref;
          }}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View>
            <Text>Hello Olly,</Text>
            <Text testID="heading">Welcome to TrailMate</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};
const styles = StyleSheet.create({});

export default App;
