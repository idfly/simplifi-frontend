import { InputHTMLAttributes } from "react";
interface SliderLabelProps {
    progress: number;
}
interface StyledInputProps extends InputHTMLAttributes<HTMLInputElement> {
    isMax: boolean;
}
export declare const SliderLabel: import("styled-components").StyledComponent<"div", import("styled-components").DefaultTheme, import("../Text").TextProps & SliderLabelProps, never>;
export declare const BunnyButt: import("styled-components").StyledComponent<"img", import("styled-components").DefaultTheme, {}, never>;
export declare const BunnySlider: import("styled-components").StyledComponent<"div", import("styled-components").DefaultTheme, {}, never>;
export declare const StyledInput: import("styled-components").StyledComponent<"input", import("styled-components").DefaultTheme, StyledInputProps, never>;
export declare const BarBackground: import("styled-components").StyledComponent<"div", import("styled-components").DefaultTheme, {}, never>;
export declare const BarProgress: import("styled-components").StyledComponent<"div", import("styled-components").DefaultTheme, {
    progress: number;
    isMax: boolean;
}, never>;
export {};
