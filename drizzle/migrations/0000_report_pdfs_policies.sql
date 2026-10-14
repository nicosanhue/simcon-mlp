CREATE POLICY "Public read report-pdfs" ON storage.objects FOR SELECT USING (bucket_id = 'report-pdfs');
CREATE POLICY "Public insert report-pdfs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'report-pdfs');
CREATE POLICY "Public update report-pdfs" ON storage.objects FOR UPDATE USING (bucket_id = 'report-pdfs');
CREATE POLICY "Public delete report-pdfs" ON storage.objects FOR DELETE USING (bucket_id = 'report-pdfs');