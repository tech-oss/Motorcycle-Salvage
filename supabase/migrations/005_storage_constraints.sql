-- ============================================================================
-- 005_storage_constraints.sql
--
-- Size and MIME limits on the storage buckets.
--
-- Files are uploaded straight from the browser to Supabase Storage rather
-- than through the Next.js server: serverless request bodies are capped
-- (4.5MB on Vercel) and a bike photo can exceed that easily. That also means
-- the server never sees the bytes, so it cannot vet them — these bucket
-- constraints are the actual enforcement point, applied by Storage itself
-- before an object is written. Client-side checks are UX only.
-- ============================================================================

update storage.buckets
   set file_size_limit = 20971520,  -- 20 MB
       allowed_mime_types = array[
         'application/pdf',
         'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'text/csv',
         'text/plain'
       ]
 where id = 'documents';

update storage.buckets
   set file_size_limit = 15728640,  -- 15 MB; phone photos run large
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
       ]
 where id = 'photos';
