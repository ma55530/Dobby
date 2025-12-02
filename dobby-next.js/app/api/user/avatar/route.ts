import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json({ error: 'File size too large (max 5MB)' }, { status: 400 });
    }

    // upload to Supabase Storage
    //user_id + timestamp + extension
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    const filePath = `${fileName}`;

    // delete the old profile pic if it exists
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (currentProfile?.avatar_url) {
      const oldUrl = currentProfile.avatar_url;

      try {
        const urlObj = new URL(oldUrl);
        const pathParts = urlObj.pathname.split('/avatars/');
        if (pathParts.length > 1) {
          const oldPath = decodeURIComponent(pathParts[1]);
          console.log('Deleting old avatar:', oldPath);
          const { error: deleteError } = await supabase.storage.from('avatars').remove([oldPath]);
          if (deleteError) {
             console.error('Error deleting old avatar:', deleteError);
          }
        }
      } catch (e) {
        console.error('Error parsing old avatar URL:', e);
      }
    }

    const { error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
      return NextResponse.json({ error: `Failed to upload image: ${uploadError.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ avatar_url: publicUrl });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
