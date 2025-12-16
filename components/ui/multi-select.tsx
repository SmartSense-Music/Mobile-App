import { IconSymbol } from "@/components/ui/icon-symbol";
import { Palette } from "@/constants/theme";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Option {
  id: string;
  name: string;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  label,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select options...",
}: MultiSelectProps) {
  const [visible, setVisible] = useState(false);

  const toggleOption = (id: string) => {
    if (selectedValues.includes(id)) {
      onSelectionChange(selectedValues.filter((v) => v !== id));
    } else {
      onSelectionChange([...selectedValues, id]);
    }
  };

  const getSelectedLabel = () => {
    if (selectedValues.length === 0) return placeholder;
    const selectedNames = options
      .filter((opt) => selectedValues.includes(opt.id))
      .map((opt) => opt.name);
    return selectedNames.join(", ");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setVisible(true)}
      >
        <Text
          style={[
            styles.selectorText,
            selectedValues.length === 0 && styles.placeholder,
          ]}
          numberOfLines={1}
        >
          {getSelectedLabel()}
        </Text>
        <IconSymbol name="chevron.down" size={20} color={Palette.lightGray} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <IconSymbol name="xmark" size={24} color={Palette.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList}>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionItem,
                      isSelected && styles.optionSelected,
                    ]}
                    onPress={() => toggleOption(option.id)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {option.name}
                    </Text>
                    {isSelected && (
                      <IconSymbol
                        name="checkmark"
                        size={20}
                        color={Palette.black}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: Palette.lightGray,
    marginBottom: 8,
    fontSize: 14,
  },
  selector: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorText: {
    color: Palette.white,
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  placeholder: {
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1E1E1E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Palette.white,
  },
  optionsList: {
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  optionSelected: {
    backgroundColor: Palette.gold,
  },
  optionText: {
    fontSize: 16,
    color: Palette.white,
  },
  optionTextSelected: {
    color: Palette.black,
    fontWeight: "bold",
  },
  doneButton: {
    backgroundColor: Palette.gold,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  doneButtonText: {
    color: Palette.black,
    fontSize: 16,
    fontWeight: "bold",
  },
});
