import React from 'react';
import {StyleProp, Text, TouchableOpacity, ViewStyle} from 'react-native';
import {useTheme, HIT_SLOP, ACTIVE_OPACITY} from '../theme';

interface Props {
  isFav: boolean;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function FavoriteButton({isFav, onPress, size = 22, style}: Props) {
  const {colors} = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP}
      activeOpacity={ACTIVE_OPACITY}
      style={style}>
      <Text style={{fontSize: size, color: isFav ? colors.warning : colors.textDisabled}}>
        {isFav ? '★' : '☆'}
      </Text>
    </TouchableOpacity>
  );
}
