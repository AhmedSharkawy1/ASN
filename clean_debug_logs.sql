-- Clean up existing technical debug logs from order_logs
DELETE FROM order_logs 
WHERE action NOT LIKE 'status_%' 
  AND action NOT LIKE 'payment_%'
  AND performed_by = 'system';
