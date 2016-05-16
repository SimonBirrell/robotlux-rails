FactoryGirl.define do
  factory :user do
  	association :org
    confirmed_at Time.now
    sequence :name do |n|
      "Test User #{n}"
    end
    sequence :email do |n|
     "test#{n}@example.com"
    end
    password "secret123"

    trait :admin do
      role 'admin'
    end

  end
end
