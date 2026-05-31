import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nlcvaxtsqjhonshmgpux.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sY3ZheHRzcWpob25zaG1ncHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMzY3MDYsImV4cCI6MjA5NTgxMjcwNn0.0rp_oPsxpJf_yaDLaVAHRnV9h11ZKBAWL_Fp0MNihpo";

export const supabase = createClient(supabaseUrl, supabaseKey);