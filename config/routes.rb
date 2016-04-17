Rails.application.routes.draw do

  devise_for :users
  devise_scope :user do

    resources :users

    authenticated :user do
      root 'home#index', as: :authenticated_root
    end

    unauthenticated do
      root 'devise/sessions#new', as: :unauthenticated_root
    end
  end
  
  get '/demo', to: 'home#demo'

  # http://stackoverflow.com/questions/22741975/undefined-local-variable-or-method-root-path
  root "static#home"
  
end
