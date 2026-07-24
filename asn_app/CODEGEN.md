# Code generation status

## Current state

`build_runner` **cannot run** in this environment:

```
E 'dart compile' does not support build hooks, use 'dart build' instead.
```

The fix landed in `build_runner 2.15.2`, which requires **Dart SDK ^3.11.0**.
This project is on **Dart 3.10.8**, so pub refuses the upgrade.

## What this means

The project deliberately runs a **mixed** model layer:

| Layer | Style | Regenerate needed? |
|---|---|---|
| `OrderModel`, `OrderItemModel` | hand-written | no |
| `OrderEntity`, `OrderItemEntity` | hand-written | no |
| `ProductModel`, `CategoryModel`, and every module model | hand-written | no |
| `UserModel` | freezed + json_serializable | **yes** |
| `UserEntity` | freezed | **yes** |
| `AuthState` (`auth_provider`) | freezed union | **yes** |
| `Failures` | freezed | **yes** |

The generated `.freezed.dart` / `.g.dart` files for those four are **committed
and valid**. The app compiles, analyzes clean and runs. Nothing is broken today.

The limitation is *maintenance*: adding or renaming a field on any of those four
types requires regenerating, which currently fails.

## How to fix properly

Upgrade the toolchain, then regenerate:

```bash
flutter upgrade            # brings Dart >= 3.11
flutter pub upgrade build_runner
dart run build_runner build --delete-conflicting-outputs
```

Then bump the constraint in `pubspec.yaml` to `build_runner: ^2.15.2`.

## Why this wasn't hand-converted

`AuthState` is a freezed *union* consumed by `maybeWhen(...)` in ~20 call sites
across routing, permissions and every data provider. Hand-writing that union
correctly is a sizeable refactor on the most safety-critical path in the app
(authentication + permission gating). Doing it immediately before a store
release trades a maintenance inconvenience for real regression risk, so it was
deliberately deferred until the toolchain upgrade — which removes the problem
entirely and costs nothing.

## Workaround until then

If one of those four types must change before upgrading Flutter, convert *that
single type* to a hand-written class (as was already done for `OrderModel` and
`OrderEntity`) rather than trying to run codegen.
