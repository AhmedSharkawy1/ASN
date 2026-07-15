import 'package:flutter/material.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';

class CustomersScreen extends StatelessWidget {
  const CustomersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customers Screen'),
      ),
      drawer: const AppNavigationDrawer(),
      body: const Center(
        child: Text('Customers Management Screen'),
      ),
    );
  }
}
