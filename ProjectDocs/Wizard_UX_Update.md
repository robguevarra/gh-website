# Campaign Wizard UX Updates

**Date:** January 20, 2026
**Updates:** Campaign Naming & Template Selection

---

## 1. Internal Campaign Naming
You now have a dedicated field for naming your campaigns internally. This helps organize your dashboard without affecting the email Subject Line.

### How it works:
*   **Step 1 (Settings)**: Enter a name in the "Internal Campaign Name" field.
*   **Database**: The campaign is saved with this name.
*   **Fallback**: If left blank, it defaults to the Subject Line.

![Naming Field](https://placehold.co/600x200/png?text=Internal+Campaign+Name+Input)

---

## 2. Template Selection
We have introduced a new **Template Picker** step before the design editor loads.

### The Flow:
1.  **Step 3 (Design)**: Initially shows the Picker.
2.  **Options**:
    *   **Start from Scratch**: Loads a blank canvas.
    *   **Select Template**: Choose from your saved templates.
3.  **Editor**: Once selected, the Unlayer editor loads with your choice.
4.  **Change Mind?**: Use the "Change Template" button in the top right (Warning: this discards current changes).

### Visual:
*   **Grid View**: Shows thumbnails of your templates.
*   **Smooth Transition**: No more empty editor loading first.

---

## Files Changed.
*   `store.ts`: Added `name` field.
*   `actions.ts`: Updated `createCampaign` and added `getTemplates`.
*   `step-settings.tsx`: Added Input field.
*   `step-design.tsx`: Added Picker logic.
*   `template-picker.tsx`: **[NEW]** Component for selecting templates.

**Signed Off By**: Antigravity (AI Assistant)
