module ApplicationHelper
  
  def link_to_submit(*args, &block)
    link_to_function (block_given? ? capture(&block) : args[0]), "$(this).closest('form').submit()", args.extract_options!
  end
    
  def bootstrap_error_class(flash_key)
  	flash_key_to_bootstrap_key = {'alert' => 'danger', 'notice' => 'info'}
  	bootstrap_key = flash_key_to_bootstrap_key[flash_key] || flash_key
  	"alert alert-#{bootstrap_key}"
  end

end
