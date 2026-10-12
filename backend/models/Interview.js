import mongoose from "mongoose";

const interviewSchema=new mongoose.Schema({
  application: {
    type:mongoose.Schema.Types.ObjectId, ref:"JobApplication", required:true, unique:true
  }

  ,
  job: {
    type:mongoose.Schema.Types.ObjectId, ref:"JobPost", required:true
  }

  ,
  candidate: {
    type:mongoose.Schema.Types.ObjectId, ref:"User", required:true
  }

  ,
  company: {
    type:mongoose.Schema.Types.ObjectId, ref:"User", required:true
  }

  ,
  date: {
    type:Date, required:true
  }

  , type: {
    type:String, enum:["Online", "Offline"], default:"Online"
  }

  ,
  meetingLink: {
    type:String, default:""
  }

  , location: {
    type:String, default:""
  }

  , notes: {
    type:String, default:""
  }

  ,
  status: {
    type:String, enum:["Scheduled", "Completed", "Cancelled"], default:"Scheduled"
  }
}

, {
timestamps:true
});
export default mongoose.model("Interview", interviewSchema);