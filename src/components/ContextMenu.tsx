import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type ContextMenuAction = {
  key: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export type ContextMenuAnchor = {
  x: number;
  y: number;
};

type ContextMenuProps = {
  visible: boolean;
  title: string;
  actions: ContextMenuAction[];
  onClose: () => void;
  /**
   * Posición del puntero en la ventana. En web el menú aparece junto al cursor,
   * como un menú contextual de escritorio; sin ancla se centra sobre la pantalla.
   */
  anchor?: ContextMenuAnchor | null;
};

const MENU_WIDTH = 248;
const EDGE_GAP = 8;
const ANCHOR_OFFSET = 2;
const ESTIMATED_MENU_HEIGHT = 136;

type PressableRef = React.ComponentRef<typeof Pressable>;

export function ContextMenu({ visible, title, actions, onClose, anchor }: ContextMenuProps) {
  const { colors } = useTheme();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const firstRowRef = useRef<PressableRef | null>(null);
  const isWeb = Platform.OS === 'web';
  const anchorPoint = isWeb ? anchor ?? null : null;

  useEffect(() => {
    if (!visible || !isWeb) {
      return;
    }
    // En web el foco entra al primer elemento para que el teclado pueda recorrer el menú.
    const node = firstRowRef.current as unknown as { focus?: () => void } | null;    node?.focus?.();
  }, [visible, isWeb]);

  const menuHeight = measuredHeight || ESTIMATED_MENU_HEIGHT;
  const position = anchorPoint
    ? {
        left: Math.min(
          Math.max(EDGE_GAP, anchorPoint.x + ANCHOR_OFFSET),
          Math.max(EDGE_GAP, viewportWidth - MENU_WIDTH - EDGE_GAP)
        ),
        top:
          anchorPoint.y + ANCHOR_OFFSET + menuHeight > viewportHeight - EDGE_GAP
            ? Math.max(EDGE_GAP, anchorPoint.y - menuHeight)
            : Math.max(EDGE_GAP, anchorPoint.y + ANCHOR_OFFSET),
      }
    : null;
  const variant = position ? 'popover' : 'dialog';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, position ? styles.overlayAnchored : styles.overlayCentered]}>
        {isWeb ? (
          <View style={StyleSheet.absoluteFill} onClick={onClose} />
        ) : (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessible={false}
            importantForAccessibility="no"
          />
        )}

        <View
          style={[
            styles.menu,
            position ? styles.menuPopover : styles.menuDialog,
            { backgroundColor: colors.surface, borderColor: colors.border },
            position
              ? {
                  ...position,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.18,
                  shadowRadius: 24,
                }
              : null,
          ]}
          onLayout={isWeb ? event => setMeasuredHeight(event.nativeEvent.layout.height) : undefined}
          accessibilityViewIsModal
        >
          <Text
            style={[
              styles.title,
              position ? styles.titlePopover : styles.titleDialog,
              { color: position ? colors.textSecondary : colors.text },
            ]}
          >
            {title}
          </Text>

          {actions.map((action, index) => (
            <ContextMenuRow
              key={action.key}
              label={action.label}
              onPress={action.onPress}
              variant={variant}
              tone={action.destructive ? 'destructive' : 'default'}
              isLast={index === actions.length - 1}
              accessibilityLabel={action.accessibilityLabel}
              accessibilityHint={action.accessibilityHint}
              onClose={onClose}
              rowRef={index === 0 ? firstRowRef : undefined}
            />
          ))}

          {!position && (
            <ContextMenuRow
              label="Cancelar"
              onPress={onClose}
              variant="dialog"
              tone="cancel"
              accessibilityLabel="Cancelar"
              onClose={onClose}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function ContextMenuRow({
  label,
  onPress,
  variant,
  tone = 'default',
  isLast = false,
  accessibilityLabel,
  accessibilityHint,
  onClose,
  rowRef,
}: {
  label: string;
  onPress: () => void;
  variant: 'popover' | 'dialog';
  tone?: 'default' | 'destructive' | 'cancel';
  isLast?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onClose: () => void;
  rowRef?: React.Ref<PressableRef>;
}) {
  const { colors } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const isWeb = Platform.OS === 'web';
  const isPopover = variant === 'popover';
  const isCancel = tone === 'cancel';

  return (
    <Pressable
      ref={rowRef}
      style={[
        styles.row,
        isPopover ? styles.rowPopover : styles.rowDialog,
        isCancel ? [styles.rowCancel, { backgroundColor: colors.surfaceSecondary }] : null,
        !isPopover && !isCancel && !isLast
          ? { borderBottomWidth: 1, borderBottomColor: colors.border }
          : null,
        isWeb && (hovered || focused) ? { backgroundColor: colors.surfaceSecondary } : null,
        isWeb && focused
          ? { outlineWidth: 2, outlineStyle: 'solid', outlineColor: colors.focusRing, outlineOffset: -2 }
          : null,
      ]}
      onPress={() => {
        onClose();
        onPress();
      }}
      onHoverIn={isWeb ? () => setHovered(true) : undefined}
      onHoverOut={isWeb ? () => setHovered(false) : undefined}
      onFocus={isWeb ? () => setFocused(true) : undefined}
      onBlur={isWeb ? () => setFocused(false) : undefined}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
    >
      <Text
        style={[
          styles.rowText,
          isPopover ? styles.rowTextPopover : styles.rowTextDialog,
          { color: tone === 'destructive' ? colors.error : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayAnchored: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  menu: {
    borderRadius: 12,
    borderWidth: 1,
  },
  menuDialog: {
    width: '80%',
    maxWidth: 300,
    padding: 20,
  },
  menuPopover: {
    position: 'absolute',
    width: MENU_WIDTH,
    padding: 6,
    elevation: 12,
  },
  title: {
    letterSpacing: -0.5,
  },
  titleDialog: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  titlePopover: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'left',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  row: {
    justifyContent: 'center',
  },
  rowDialog: {
    padding: 16,
  },
  rowPopover: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowCancel: {
    marginTop: 12,
    borderRadius: 8,
  },
  rowText: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowTextDialog: {
    textAlign: 'center',
  },
  rowTextPopover: {
    textAlign: 'left',
  },
});
