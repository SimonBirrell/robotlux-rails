FactoryGirl.define do
  factory :agent_session do
    agent_id 1
	start_time "2016-05-06 10:02:44"
	end_time "2016-05-06 10:02:44"
	hostname "MyString"
	ros_master_uri "MyString"
	session_status "MyString"
	token "MyString"
	association :agent
  end

end
