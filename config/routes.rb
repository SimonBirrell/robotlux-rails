Rails.application.routes.draw do
  #root to: 'visitors#index'

#  devise_scope :user do
#    root to: "devise/sessions#new"
#  end
#
  devise_for :users
  devise_scope :user do
    authenticated :user do
      root 'home#index', as: :authenticated_root
    end

    unauthenticated do
      root 'devise/sessions#new', as: :unauthenticated_root
    end
  end
  
  resources :users
  
end
