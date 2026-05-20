// Core PHP built-in functions for Monaco completion
export const PHP_FUNCTIONS: string[] = [
  // String
  'strlen','substr','strpos','strrpos','str_replace','str_ireplace','str_contains',
  'str_starts_with','str_ends_with','str_pad','str_repeat','str_split','str_word_count',
  'strtolower','strtoupper','ucfirst','lcfirst','ucwords','ltrim','rtrim','trim',
  'implode','explode','join','preg_match','preg_match_all','preg_replace','preg_split',
  'sprintf','printf','vsprintf','number_format','nl2br','htmlspecialchars','htmlentities',
  'strip_tags','addslashes','stripslashes','wordwrap','chunk_split','quoted_printable_encode',
  'mb_strlen','mb_substr','mb_strtolower','mb_strtoupper','mb_strpos','mb_convert_encoding',
  'md5','sha1','hash','crc32','base64_encode','base64_decode','urlencode','urldecode',
  'http_build_query','parse_str','parse_url','rawurlencode','rawurldecode',
  'substr_count','substr_replace','str_contains','similar_text','levenshtein','soundex',
  'hex2bin','bin2hex','ord','chr',

  // Array
  'array_map','array_filter','array_reduce','array_walk','array_walk_recursive',
  'array_keys','array_values','array_merge','array_merge_recursive','array_combine',
  'array_diff','array_diff_key','array_intersect','array_intersect_key',
  'array_slice','array_splice','array_chunk','array_unique','array_flip',
  'array_push','array_pop','array_shift','array_unshift','array_pad',
  'array_search','array_key_exists','array_key_first','array_key_last',
  'array_reverse','array_column','array_fill','array_fill_keys','array_count_values',
  'sort','rsort','asort','arsort','ksort','krsort','usort','uasort','uksort','natsort',
  'in_array','count','sizeof','range','compact','extract','list',
  'array_sum','array_product','array_rand','shuffle',

  // Math
  'abs','ceil','floor','round','max','min','pow','sqrt','log','log10','log2',
  'exp','fmod','intdiv','fdiv','hypot','pi','sin','cos','tan','asin','acos','atan','atan2',
  'rand','mt_rand','random_int','random_bytes','base_convert','bindec','octdec','hexdec',
  'decbin','decoct','dechex','number_format','fmod','intval','floatval','doubleval',

  // Date/Time
  'time','microtime','mktime','gmmktime','date','gmdate','strtotime','date_create',
  'date_format','date_add','date_sub','date_diff','date_modify','date_interval_create_from_date_string',
  'checkdate','date_default_timezone_set','date_default_timezone_get',

  // JSON
  'json_encode','json_decode','json_last_error','json_last_error_msg',

  // File & IO
  'file_get_contents','file_put_contents','file_exists','is_file','is_dir','is_readable',
  'is_writable','mkdir','rmdir','unlink','rename','copy','move_uploaded_file',
  'realpath','dirname','basename','pathinfo','glob','scandir','opendir','readdir','closedir',
  'fopen','fclose','fread','fwrite','fgets','feof','fseek','ftell','fflush','ftruncate',
  'tempnam','sys_get_temp_dir','disk_free_space','disk_total_space','filesize','filemtime',

  // Type checking & casting
  'is_array','is_string','is_int','is_integer','is_float','is_double','is_bool','is_null',
  'is_numeric','is_object','is_callable','is_resource','is_a','instanceof',
  'gettype','settype','intval','strval','floatval','boolval','settype',
  'isset','empty','unset','defined','get_class','get_parent_class','is_subclass_of',

  // Object/Class
  'class_exists','interface_exists','trait_exists','method_exists','property_exists',
  'get_class','get_parent_class','get_object_vars','get_class_methods','class_implements',
  'class_uses','class_parents','spl_object_id','spl_object_hash',
  'new','clone',

  // Error handling
  'set_error_handler','set_exception_handler','restore_error_handler',
  'error_reporting','trigger_error','error_log','debug_backtrace','debug_print_backtrace',
  'throw',

  // Output
  'echo','print','printf','var_dump','var_export','print_r','ob_start','ob_end_clean',
  'ob_get_clean','ob_get_contents','ob_end_flush','ob_flush','flush',

  // Misc
  'sleep','usleep','time','microtime','getenv','putenv','php_uname','phpversion',
  'php_sapi_name','extension_loaded','function_exists','constant','define',
  'header','headers_sent','http_response_code','setcookie','session_start','session_destroy',
  'password_hash','password_verify','password_needs_rehash',
  'serialize','unserialize','igbinary_serialize','igbinary_unserialize',
  'call_user_func','call_user_func_array','array_map','forward_static_call',
  'iterator_to_array','spl_autoload_register',

  // Laravel global helpers
  'abort','abort_if','abort_unless','app','auth','back','bcrypt','blank','broadcast',
  'cache','collect','config','cookie','csrf_field','csrf_token','decrypt','dispatch',
  'dump','dd','encrypt','env','event','factory','filled','info','logger',
  'now','old','optional','policy','redirect','report','request','rescue',
  'resolve','response','retry','route','session','storage','tap','throw_if',
  'throw_unless','today','trans','trans_choice','url','validator','value','view','with',
]

// Common PHP constants
export const PHP_CONSTANTS: string[] = [
  'PHP_EOL','PHP_INT_MAX','PHP_INT_MIN','PHP_INT_SIZE','PHP_FLOAT_MAX','PHP_FLOAT_MIN',
  'PHP_FLOAT_EPSILON','PHP_MAJOR_VERSION','PHP_MINOR_VERSION','PHP_VERSION','PHP_OS',
  'PHP_SAPI','PHP_MAXPATHLEN','PHP_PREFIX','PHP_BINARY','PHP_DEBUG','PHP_ZTS',
  'DIRECTORY_SEPARATOR','PATH_SEPARATOR','SORT_REGULAR','SORT_NUMERIC','SORT_STRING',
  'SORT_LOCALE_STRING','SORT_NATURAL','SORT_FLAG_CASE','ARRAY_FILTER_USE_KEY',
  'ARRAY_FILTER_USE_BOTH','JSON_PRETTY_PRINT','JSON_UNESCAPED_UNICODE',
  'JSON_UNESCAPED_SLASHES','JSON_THROW_ON_ERROR','JSON_FORCE_OBJECT',
  'STR_PAD_LEFT','STR_PAD_RIGHT','STR_PAD_BOTH','ENT_QUOTES','ENT_HTML5',
  'STDIN','STDOUT','STDERR','TRUE','FALSE','NULL',
]
