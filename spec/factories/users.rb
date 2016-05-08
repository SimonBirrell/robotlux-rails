FactoryGirl.define do
  factory :user do
  	association :org
    confirmed_at Time.now
    name "Test User"
    email "test@example.com"
    password "secret123"

    trait :admin do
      role 'admin'
    end

  end
end
