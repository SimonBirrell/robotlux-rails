Rails.application.routes.draw do

  resources :agent_sessions
  resources :agents
  devise_for :users, :controllers => {sessions: 'sessions'} 
  devise_scope :user do

    # API 
    namespace :api do
      namespace :v1 do
        resources :orgs do
          get 'agents_info', on: :member
          resources :agents
        end
      end
    end

    resources :users
    resources :orgs do
      get 'agents_info', on: :member
    end

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
