import 'package:flutter/material.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';

class PosScreen extends StatelessWidget {
  const PosScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('POS Screen'),
      ),
      drawer: const AppNavigationDrawer(),
      body: const Center(
        child: Text('Point of Sale (POS) Screen'),
      ),
    );
  }
}
