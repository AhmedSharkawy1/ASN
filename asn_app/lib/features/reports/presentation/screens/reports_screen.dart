import 'package:flutter/material.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports Screen'),
      ),
      drawer: const AppNavigationDrawer(),
      body: const Center(
        child: Text('Sales & Business Reports Screen'),
      ),
    );
  }
}
