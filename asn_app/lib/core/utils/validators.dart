class Validators {
  Validators._();

  static String? validateUsernameOrEmail(String? value, {required String emptyMessage}) {
    if (value == null || value.trim().isEmpty) {
      return emptyMessage;
    }
    return null;
  }

  static String? validatePassword(String? value, {required String emptyMessage, required String shortMessage}) {
    if (value == null || value.trim().isEmpty) {
      return emptyMessage;
    }
    if (value.trim().length < 6) {
      return shortMessage;
    }
    return null;
  }
}
