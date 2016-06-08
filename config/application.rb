require File.expand_path('../boot', __FILE__)

require 'rails/all'

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Robotlux
  class Application < Rails::Application

    config.generators do |g|
      g.test_framework :rspec,
        fixtures: true,
        view_specs: false,
        helper_specs: false,
        routing_specs: false,
        controller_specs: false,
        request_specs: false
      g.fixture_replacement :factory_girl, dir: "spec/factories"
    end

    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration should go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded.

    # Set Time.zone default to the specified zone and make Active Record auto-convert to this zone.
    # Run "rake -D time" for a list of tasks for finding time zone names. Default is UTC.
    # config.time_zone = 'Central Time (US & Canada)'

    # The default locale is :en and all translations from config/locales/*.rb,yml are auto loaded.
    # config.i18n.load_path += Dir[Rails.root.join('my', 'locales', '*.{rb,yml}').to_s]
    # config.i18n.default_locale = :de

    # Do not swallow errors in after_commit/after_rollback callbacks.
    config.active_record.raise_in_transactional_callbacks = true
    
    # Simon Changes
    config.assets.paths << Rails.root.join("vendor","assets", "fonts")

    config.action_mailer.delivery_method = :postmark
    config.action_mailer.postmark_settings = {
      api_token: ENV['POSTMARK_API_TOKEN']
    }

    # ActionMailer::Base.smtp_settings = {
    #   :port           => '25', # or 2525
    #   :address        => ENV['POSTMARK_SMTP_SERVER'],
    #   :user_name      => ENV['POSTMARK_API_TOKEN'],
    #   :password       => ENV['POSTMARK_API_TOKEN'],
    #   :domain         => 'robotlux.heroku.com',
    #   :authentication => :cram_md5, # or :plain for plain-text authentication
    #   :enable_starttls_auto => true, # or false for unencrypted connection
    # }
    # ActionMailer::Base.delivery_method = :smtp

  end
end
