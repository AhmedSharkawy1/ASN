import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/config/app_config.dart';
import 'package:asn_app/core/logging/logger.dart';

/// Uploads menu images through the platform's existing Next.js
/// /api/upload-image route (same path the web dashboard uses), which
/// stores them in the Supabase `menu-images` bucket.
class ImageUploadService {
  final Dio _dio;

  ImageUploadService()
      : _dio = Dio(BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 20),
          receiveTimeout: const Duration(seconds: 60),
          sendTimeout: const Duration(seconds: 60),
        ));

  /// Returns the public URL of the uploaded image.
  Future<String> uploadImage(File file) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: 'image.jpg'),
      });

      final response = await _dio.post<Map<String, dynamic>>(
        '/api/upload-image',
        data: formData,
      );

      final url = response.data?['originalUrl'] as String?;
      if (url == null || url.isEmpty) {
        throw Exception(response.data?['error']?.toString() ?? 'Upload returned no URL');
      }
      return url;
    } on DioException catch (e) {
      AppLogger.error('Image upload failed', error: e, name: 'ImageUpload');
      final serverMsg = e.response?.data is Map ? (e.response?.data['error']?.toString()) : null;
      throw Exception(serverMsg ?? 'Image upload failed: ${e.message}');
    }
  }
}

final imageUploadServiceProvider = Provider<ImageUploadService>((ref) {
  return ImageUploadService();
});
