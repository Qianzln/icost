# 小家账本 (iCost) — 项目约定

## 编码原则

启用 ponytail 技能（full 模式）：每次改代码前走懒人阶梯——先问能不能不改、有没有现成的、能不能一行搞定，最后才写最小方案。禁止过度工程化。

## 技术栈

- React 18 + TypeScript + Vite
- Tailwind CSS v4（@theme 指令定义主题色）
- Zustand（全局状态）
- Supabase（后端，待接入）
- Capacitor（后期转 APK）

## 代码风格

- 优先复用已有组件和 store 中的工具函数
- 不引入新依赖，除非现有方案确实无法覆盖
- CSS 统一使用 Tailwind 类名，避免 inline style（主题色除外）
- 组件保持单文件，拆分只在超过 400 行时考虑
