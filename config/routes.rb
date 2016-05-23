Rails.application.routes.draw do

  resources :robot_instance_sessions
  resources :robot_instances
  resources :agent_sessions
  resources :agents
  devise_for :users, :controllers => {sessions: 'sessions'} 
  devise_scope :user do

    # API 
    namespace :api do
      namespace :v1 do
        post 'users/sign_in' => 'sessions#create'
        delete 'users/sign_out' => 'sessions#destroy'

        resources :orgs do
          get 'agents_info', on: :member
          resources :agents
        end
      end
    end

    #resources :users do
    # http://stackoverflow.com/questions/23140117/allow-a-user-to-add-new-users-in-devise-and-remain-logged-in-as-themselves
    resources :users_admin, :controller => 'users' do
      get 'my_data', on: :collection
    end

    resources :orgs do
      get 'agents_info', on: :member
    end

    authenticated :user do
      root 'home#index', as: :authenticated_root
    end

    #authenticated do
    #end 

    unauthenticated do
      root 'devise/sessions#new', as: :unauthenticated_root
    end
  end
  
  get '/demo', to: 'home#demo'

  # http://stackoverflow.com/questions/22741975/undefined-local-variable-or-method-root-path
  root "static#home"
  
end
